function Dashboard() {
  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="bg-white p-6 rounded-xl shadow">
        <h3 className="text-gray-500">Total Properties</h3>
        <p className="text-2xl font-bold mt-2">24</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow">
        <h3 className="text-gray-500">Total Tenants</h3>
        <p className="text-2xl font-bold mt-2">18</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow">
        <h3 className="text-gray-500">Monthly Revenue</h3>
        <p className="text-2xl font-bold mt-2">TZS 12M</p>
      </div>
    </div>
  );
}

export default Dashboard;
