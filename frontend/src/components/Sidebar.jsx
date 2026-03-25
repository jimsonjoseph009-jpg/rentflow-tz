import { useNavigate } from 'react-router-dom';

function Sidebar({ active, setActive }) {
  const navigate = useNavigate();
  const menuItems = [
    "Dashboard",
    "Properties",
    "Tenants",
    "Payments",
    "Reports",
  ];

  return (
    <div className="w-64 bg-white shadow-lg p-5 min-h-screen">
      <h2 className="text-2xl font-bold text-purple-700 mb-10" style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
        <span className="rf-marquee-text">RentFlow TZ</span>
      </h2>

      <ul className="space-y-4">
        {menuItems.map((item) => (
          <li
            key={item}
            onClick={() => {
              setActive(item);
              navigate(`/${item.toLowerCase()}`);
            }}
            className={`cursor-pointer p-2 rounded-lg ${
              active === item
                ? "bg-purple-100 text-purple-700 font-semibold"
                : "hover:text-purple-600"
            }`}
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Sidebar;
