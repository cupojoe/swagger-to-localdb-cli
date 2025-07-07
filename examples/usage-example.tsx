import React, { useState, useEffect } from 'react';

// Import the generated API functions and types
import { 
  listPets, 
  createPet, 
  getPetById, 
  updatePet, 
  deletePet 
} from '../test-output/api/pets-api';
import { Pet, NewPet } from '../test-output/types';

/**
 * Example React component demonstrating how to use the generated API
 * This shows how frontend development can proceed while backend APIs are being built
 */
const PetStoreExample: React.FC = () => {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load pets when component mounts
  useEffect(() => {
    loadPets();
  }, []);

  const loadPets = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // This call uses IndexedDB under the hood
      const response = await listPets({ limit: 10 });
      setPets(response.data);
      
      console.log('Loaded pets from IndexedDB:', response.data);
    } catch (err) {
      setError('Failed to load pets');
      console.error('Error loading pets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePet = async () => {
    try {
      const newPetData: NewPet = {
        name: `Pet ${Date.now()}`,
        category: 'dog',
        status: 'available',
        tags: ['friendly', 'cute'],
        photoUrls: ['https://example.com/photo.jpg']
      };

      // This creates a new record in IndexedDB
      const response = await createPet(newPetData);
      setPets([...pets, response.data]);
      
      console.log('Created new pet:', response.data);
    } catch (err) {
      setError('Failed to create pet');
      console.error('Error creating pet:', err);
    }
  };

  const handleUpdatePet = async (petId: string, status: Pet['status']) => {
    try {
      // This updates the record in IndexedDB
      const response = await updatePet(petId, { status });
      setPets(pets.map(pet => 
        pet.id === petId ? response.data : pet
      ));
      
      console.log('Updated pet:', response.data);
    } catch (err) {
      setError('Failed to update pet');
      console.error('Error updating pet:', err);
    }
  };

  const handleDeletePet = async (petId: string) => {
    try {
      // This removes the record from IndexedDB
      await deletePet(petId);
      setPets(pets.filter(pet => pet.id !== petId));
      
      console.log('Deleted pet:', petId);
    } catch (err) {
      setError('Failed to delete pet');
      console.error('Error deleting pet:', err);
    }
  };

  const handleGetPetDetails = async (petId: string) => {
    try {
      // This fetches a specific record from IndexedDB
      const response = await getPetById(petId);
      console.log('Pet details:', response.data);
      alert(`Pet Details: ${JSON.stringify(response.data, null, 2)}`);
    } catch (err) {
      setError('Failed to get pet details');
      console.error('Error getting pet details:', err);
    }
  };

  if (loading) {
    return (<div className="loading">Loading pets...</div>);
  }

  return (
    <div className="pet-store">
      <h1>Pet Store Demo</h1>
      <p>This demo uses generated API functions that store data in IndexedDB</p>
      
      {error && (
        <div className="error" style={{ color: 'red', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <div className="actions" style={{ marginBottom: '2rem' }}>
        <button onClick={handleCreatePet} style={{ marginRight: '1rem' }}>
          Add Random Pet
        </button>
        <button onClick={loadPets}>
          Refresh Pets
        </button>
      </div>

      <div className="pets-grid">
        {pets.length === 0 ? (
          <p>No pets found. Click "Add Random Pet" to create some!</p>
        ) : (
          pets.map(pet => (
            <div 
              key={pet.id} 
              className="pet-card" 
              style={{ 
                border: '1px solid #ccc', 
                padding: '1rem', 
                margin: '0.5rem',
                borderRadius: '4px'
              }}
            >
              <h3>{pet.name}</h3>
              <p><strong>Category:</strong> {pet.category || 'Unknown'}</p>
              <p><strong>Status:</strong> {pet.status || 'Unknown'}</p>
              {pet.tags && pet.tags.length > 0 && (
                <p><strong>Tags:</strong> {pet.tags.join(', ')}</p>
              )}
              
              <div className="pet-actions" style={{ marginTop: '1rem' }}>
                <button 
                  onClick={() => handleGetPetDetails(pet.id)}
                  style={{ marginRight: '0.5rem' }}
                >
                  View Details
                </button>
                
                <select 
                  value={pet.status || 'available'}
                  onChange={(e) => handleUpdatePet(pet.id, e.target.value as Pet['status'])}
                  style={{ marginRight: '0.5rem' }}
                >
                  <option value="available">Available</option>
                  <option value="pending">Pending</option>
                  <option value="sold">Sold</option>
                </select>
                
                <button 
                  onClick={() => handleDeletePet(pet.id)}
                  style={{ backgroundColor: '#ff4444', color: 'white' }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="info" style={{ marginTop: '2rem', fontSize: '0.9rem', color: '#666' }}>
        <h4>How this works:</h4>
        <ul>
          <li>All API calls are intercepted and handled by IndexedDB</li>
          <li>Data persists in your browser's local database</li>
          <li>No backend server is needed for development</li>
          <li>When the real APIs are ready, just swap the import statements</li>
          <li>Open browser DevTools → Application → IndexedDB to see the data</li>
        </ul>
      </div>
    </div>
  );
};

export default PetStoreExample;