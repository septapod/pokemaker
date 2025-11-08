/**
 * Home Page
 *
 * This is the first page users see when they open PokéMaker.
 * It welcomes Aza and provides big, colorful buttons to start creating!
 */

import { Link } from 'react-router-dom';

function Home() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Welcome Section */}
      <div className="text-center mb-12">
        <h2 className="text-4xl md:text-6xl font-bold text-gray-800 mb-4">
          Welcome to PokéMaker! 🎨
        </h2>
        <p className="text-xl md:text-2xl text-gray-600">
          Create your very own Pokémon with AI-powered art!
        </p>
      </div>

      {/* Main Action Buttons */}
      <div className="grid md:grid-cols-2 gap-6 mb-12">
        {/* Create New Pokémon Button */}
        <Link to="/create">
          <div className="bg-gradient-to-br from-blue-400 to-purple-500 rounded-3xl p-8 shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 cursor-pointer">
            <div className="text-center text-white">
              <div className="text-6xl mb-4">✨</div>
              <h3 className="text-3xl font-bold mb-2">Create New</h3>
              <p className="text-lg opacity-90">
                Start making your own Pokémon from scratch!
              </p>
            </div>
          </div>
        </Link>

        {/* View Gallery Button */}
        <Link to="/gallery">
          <div className="bg-gradient-to-br from-green-400 to-teal-500 rounded-3xl p-8 shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 cursor-pointer">
            <div className="text-center text-white">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-3xl font-bold mb-2">My Pokémon</h3>
              <p className="text-lg opacity-90">
                See all the amazing Pokémon you've created!
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* Features Section */}
      <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
        <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          What Can You Do? 🌟
        </h3>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className="text-center">
            <div className="text-4xl mb-3">🎨</div>
            <h4 className="font-bold text-lg mb-2">Draw & Upload</h4>
            <p className="text-gray-600 text-sm">
              Draw your Pokémon on paper, take a photo, and upload it!
            </p>
          </div>

          {/* Feature 2 */}
          <div className="text-center">
            <div className="text-4xl mb-3">🤖</div>
            <h4 className="font-bold text-lg mb-2">AI Magic</h4>
            <p className="text-gray-600 text-sm">
              Watch as AI turns your drawing into professional Pokémon art!
            </p>
          </div>

          {/* Feature 3 */}
          <div className="text-center">
            <div className="text-4xl mb-3">💾</div>
            <h4 className="font-bold text-lg mb-2">Save Everything</h4>
            <p className="text-gray-600 text-sm">
              All your Pokémon are saved forever so you can come back anytime!
            </p>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="bg-gradient-to-r from-pink-100 to-yellow-100 rounded-2xl shadow-xl p-8">
        <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          How It Works 📝
        </h3>

        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="bg-red-500 text-white font-bold text-xl w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
              1
            </div>
            <div>
              <h4 className="font-bold text-lg">Give Your Pokémon a Name</h4>
              <p className="text-gray-700">Choose a cool name and pick its types (Fire, Water, Grass, etc.)</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="bg-blue-500 text-white font-bold text-xl w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
              2
            </div>
            <div>
              <h4 className="font-bold text-lg">Add Stats & Details</h4>
              <p className="text-gray-700">Set its HP, Attack, Defense, and special abilities!</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="bg-green-500 text-white font-bold text-xl w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
              3
            </div>
            <div>
              <h4 className="font-bold text-lg">Upload Your Drawing</h4>
              <p className="text-gray-700">Take a photo of your drawing and let AI create amazing art!</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="bg-purple-500 text-white font-bold text-xl w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
              4
            </div>
            <div>
              <h4 className="font-bold text-lg">Save & Show Off!</h4>
              <p className="text-gray-700">Your Pokémon is saved and ready to share with friends!</p>
            </div>
          </div>
        </div>

        {/* Big Start Button */}
        <div className="mt-8 text-center">
          <Link
            to="/create"
            className="inline-block bg-gradient-to-r from-red-500 to-yellow-400 text-white font-bold text-2xl px-12 py-4 rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-110 transition-all duration-300"
          >
            Let's Create! 🚀
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Home;
