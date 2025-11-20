/**
 * Home Page
 *
 * This is the first page users see when they open PokéMaker.
 * It welcomes Aza and provides big, colorful buttons to start creating!
 */

import { Link, useNavigate } from 'react-router-dom';

function Home() {
  const navigate = useNavigate();

  // Clear localStorage and navigate to create page
  const handleCreateNew = () => {
    console.log('Clearing localStorage before creating new Pokemon');
    localStorage.removeItem('pokemonImageState');
    navigate('/create');
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Welcome Section */}
      <div className="text-center mb-12">
        <h2 className="text-4xl md:text-6xl font-bold text-gray-800 mb-4 flex items-center justify-center gap-3">
          Welcome to PokéMaker <i className="ri-test-tube-fill text-5xl text-blue-600"></i>
        </h2>
        <p className="text-xl md:text-2xl text-gray-600">
          Create your very own Pokémon with magical art transformation!
        </p>
      </div>

      {/* Main Action Buttons */}
      <div className="grid md:grid-cols-2 gap-6 mb-12">
        {/* Create New Pokémon Button */}
        <div
          onClick={handleCreateNew}
          className="bg-gradient-to-br from-blue-400 to-purple-500 rounded-3xl p-8 shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 cursor-pointer min-h-64 flex items-center justify-center"
        >
          <div className="text-center text-white">
            <div className="text-6xl mb-4"><i className="ri-magic-line text-white"></i></div>
            <h3 className="text-3xl font-bold mb-2">Create New</h3>
            <p className="text-lg opacity-90">
              Start making your own Pokémon from scratch!
            </p>
          </div>
        </div>

        {/* View Gallery Button */}
        <Link to="/gallery">
          <div className="bg-gradient-to-br from-green-400 to-teal-500 rounded-3xl p-8 shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 cursor-pointer min-h-64 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="text-6xl mb-4"><i className="ri-book-line text-white"></i></div>
              <h3 className="text-3xl font-bold mb-2">My Pokémon</h3>
              <p className="text-lg opacity-90">
                See all the amazing Pokémon you've created!
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* How It Works Section */}
      <div className="bg-gradient-to-r from-pink-100 to-yellow-100 rounded-2xl shadow-xl p-8">
        <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center flex items-center justify-center gap-2">
          How It Works <i className="ri-draft-line"></i>
        </h3>

        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="bg-red-500 text-white font-bold text-xl w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
              1
            </div>
            <div>
              <h4 className="font-bold text-lg">Create Your Pokémon</h4>
              <p className="text-gray-700">Name it, pick types, set stats, and add details.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="bg-blue-500 text-white font-bold text-xl w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
              2
            </div>
            <div>
              <h4 className="font-bold text-lg">Upload Your Drawing</h4>
              <p className="text-gray-700">Draw it, snap a photo, and upload it to transform into art.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="bg-green-500 text-white font-bold text-xl w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
              3
            </div>
            <div>
              <h4 className="font-bold text-lg">Save & Show Off!</h4>
              <p className="text-gray-700">Your Pokémon is saved and ready to share with friends!</p>
            </div>
          </div>
        </div>

        {/* Big Start Button */}
        <div className="mt-8 text-center">
          <button
            onClick={handleCreateNew}
            className="inline-block bg-gradient-to-r from-red-500 to-yellow-400 text-white font-bold text-2xl px-12 py-4 rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-110 transition-all duration-300 flex items-center justify-center gap-2"
          >
            Let's Create! <i className="ri-rocket-line"></i>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Home;
