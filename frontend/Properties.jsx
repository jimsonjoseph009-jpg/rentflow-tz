import { useState, useEffect } from "react";

function Properties() {
  const [properties, setProperties] = useState([]);

  // Sample fetch function (replace with real backend API)
  const fetchProperties = async () => {
    // Temporary dummy data
    const data = [
      { id: 1, name: "Apartment A", units: 5, address: "Dar es Salaam" },
      { id: 2, name: "Villa B", units: 3, address: "Arusha" },
    ];
    setProperties(data);
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Properties</h2>

      {/* Add New Property Button */}
      <button className="mb-4 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">
        Add New Property
      </button>

      {/* Properties Table */}
      <table className="min-w-full bg-white shadow rounded">
        <thead>
          <tr className="bg-gray-200 text-left">
            <th className="py-2 px-4">ID</th>
            <th className="py-2 px-4">Name</th>
            <th className="py-2 px-4">Units</th>
            <th className="py-2 px-4">Address</th>
            <th className="py-2 px-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          {properties.map((prop) => (
            <tr key={prop.id} className="border-b">
              <td className="py-2 px-4">{prop.id}</td>
              <td className="py-2 px-4">{prop.name}</td>
              <td className="py-2 px-4">{prop.units}</td>
              <td className="py-2 px-4">{prop.address}</td>
              <td className="py-2 px-4 space-x-2">
                <button className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600">
                  Edit
                </button>
                <button className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600">
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Properties;
