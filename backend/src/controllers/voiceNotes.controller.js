const pool = require('../config/db');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const resolveAudioExt = (mime) => {
  const m = String(mime || '').toLowerCase();
  if (m.includes('webm')) return 'webm';
  if (m.includes('ogg')) return 'ogg';
  if (m.includes('wav')) return 'wav';
  if (m.includes('mpeg') || m.includes('mp3')) return 'mp3';
  if (m.includes('mp4') || m.includes('m4a')) return 'm4a';
  return 'webm';
};

exports.uploadVoiceNoteAudio = async (req, res) => {
  const landlordId = req.user.id;
  const dataUrl = String(req.body?.dataUrl || req.body?.data_url || '').trim();

  if (!dataUrl) return res.status(400).json({ message: 'dataUrl is required' });
  if (!dataUrl.startsWith('data:')) return res.status(400).json({ message: 'Invalid dataUrl format' });
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx < 0) return res.status(400).json({ message: 'Invalid dataUrl' });

  const header = dataUrl.slice(5, commaIdx); // e.g. "audio/webm;codecs=opus;base64"
  if (!header.includes('base64')) return res.status(400).json({ message: 'dataUrl must be base64 encoded' });
  const mime = header.split(';')[0]; // "audio/webm"
  const b64 = dataUrl.slice(commaIdx + 1);

  let buf;
  try {
    buf = Buffer.from(b64, 'base64');
  } catch {
    return res.status(400).json({ message: 'Invalid base64 payload' });
  }

  const maxBytes = Number(process.env.VOICE_NOTE_MAX_BYTES || 12 * 1024 * 1024); // 12MB default
  if (buf.length > maxBytes) {
    return res.status(413).json({ message: 'Audio file too large' });
  }

  const hex = buf.toString('hex', 0, 4).toUpperCase();
  const isWebm = hex === '1A45DFA3';
  const isOgg = hex === '4F676753';
  const isMp4 = buf.toString('utf8', 4, 8) === 'ftyp';
  const isWav = hex === '52494646' && buf.toString('utf8', 8, 12) === 'WAVE';

  if (!isWebm && !isOgg && !isMp4 && !isWav) {
    return res.status(400).json({ message: 'Invalid audio signature. Only authentic WebM/Ogg/MP4/WAV binaries permitted.' });
  }

  const ext = resolveAudioExt(mime);
  const filename = `vn_${landlordId}_${Date.now()}_${crypto.randomBytes(6).toString('hex')}.${ext}`;
  const dir = path.join(__dirname, '../../storage/voice-notes');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), buf);

  const apiBase = (process.env.API_PUBLIC_URL || 'http://localhost:5000').replace(/\/$/, '');
  const audio_url = `${apiBase}/voice-notes-audio/${filename}`;
  return res.status(201).json({ audio_url, mime, size: buf.length });
};

exports.createVoiceNote = async (req, res) => {
  const landlordId = req.user.id;
  const category = req.body.category;
  const audioUrl = req.body.audioUrl ?? req.body.audio_url ?? null;
  const transcription = req.body.transcription ?? null;
  const recordDate = req.body.recordDate ?? req.body.record_date ?? req.body.created_at;
  const notes = req.body.notes ?? req.body.title ?? null;

  try {
    const result = await pool.query(
      'INSERT INTO voice_notes (landlord_id, category, audio_url, transcription, record_date, notes, created_at) VALUES ($1,$2,$3,$4,$5,$6,NOW()) RETURNING *',
      [landlordId, category, audioUrl, transcription, recordDate, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getVoiceNotes = async (req, res) => {
  const landlordId = req.user.id;
  try {
    const result = await pool.query(
      `SELECT id,
              landlord_id,
              category,
              audio_url,
              transcription,
              record_date,
              record_date AS created_at,
              notes,
              notes AS title
       FROM voice_notes
       WHERE landlord_id=$1
       ORDER BY record_date DESC`,
      [landlordId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getVoiceNoteById = async (req, res) => {
  const landlordId = req.user.id;
  const { id } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM voice_notes WHERE id=$1 AND landlord_id=$2',
      [id, landlordId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Voice note not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateVoiceNote = async (req, res) => {
  const landlordId = req.user.id;
  const { id } = req.params;
  const category = req.body.category;
  const audioUrl = req.body.audioUrl ?? req.body.audio_url ?? null;
  const transcription = req.body.transcription ?? null;
  const recordDate = req.body.recordDate ?? req.body.record_date ?? req.body.created_at;
  const notes = req.body.notes ?? req.body.title ?? null;

  try {
    const result = await pool.query(
      'UPDATE voice_notes SET category=$1, audio_url=$2, transcription=$3, record_date=$4, notes=$5, updated_at=NOW() WHERE id=$6 AND landlord_id=$7 RETURNING *',
      [category, audioUrl, transcription, recordDate, notes, id, landlordId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Voice note not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteVoiceNote = async (req, res) => {
  const landlordId = req.user.id;
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM voice_notes WHERE id=$1 AND landlord_id=$2 RETURNING *',
      [id, landlordId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Voice note not found' });
    res.json({ message: 'Voice note deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getVoiceNotesByCategory = async (req, res) => {
  const landlordId = req.user.id;
  const { category } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM voice_notes WHERE landlord_id=$1 AND category=$2 ORDER BY record_date DESC',
      [landlordId, category]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};
