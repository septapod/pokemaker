/**
 * Layout Component
 *
 * This component wraps all pages and provides:
 * - A header with the app title and navigation
 * - Consistent styling across all pages
 * - Child-friendly design with Pokémon theme
 */

import { Link, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';

// Define the props (inputs) this component accepts
interface LayoutProps {
  children: ReactNode; // The page content to display inside the layout
}

function Layout({ children }: LayoutProps) {
  // useLocation hook tells us which page we're currently on
  const location = useLocation();

  // Helper function to check if a nav link is active (current page)
  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen flex flex-col">
      {/* HEADER - Shows on every page */}
      <header className="bg-gradient-to-r from-red-500 via-yellow-400 to-blue-500 shadow-lg">
        <div className="container mx-auto px-4 py-6">
          {/* App Title */}
          <Link to="/" className="block">
            <h1 className="text-4xl md:text-5xl font-bold text-white text-center mb-4 drop-shadow-lg">
              ⚡ PokéMaker ⚡
            </h1>
            <p className="text-center text-white text-sm md:text-base drop-shadow">
              Create Your Own Amazing Pokémon!
            </p>
          </Link>

          {/* NAVIGATION - Links to different pages */}
          <nav className="mt-6">
            <ul className="flex flex-wrap justify-center gap-2 md:gap-4">
              {/* Home Link */}
              <li>
                <Link
                  to="/"
                  className={`
                    px-4 py-2 rounded-full font-bold text-sm md:text-base
                    transition-all duration-200 transform hover:scale-105
                    ${isActive('/')
                      ? 'bg-white text-red-500 shadow-lg'
                      : 'bg-red-600 text-white hover:bg-red-700'
                    }
                  `}
                >
                  🏠 Home
                </Link>
              </li>

              {/* Create Pokémon Link */}
              <li>
                <Link
                  to="/create"
                  className={`
                    px-4 py-2 rounded-full font-bold text-sm md:text-base
                    transition-all duration-200 transform hover:scale-105
                    ${isActive('/create')
                      ? 'bg-white text-blue-500 shadow-lg'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                    }
                  `}
                >
                  ✨ Create
                </Link>
              </li>

              {/* Gallery Link */}
              <li>
                <Link
                  to="/gallery"
                  className={`
                    px-4 py-2 rounded-full font-bold text-sm md:text-base
                    transition-all duration-200 transform hover:scale-105
                    ${isActive('/gallery')
                      ? 'bg-white text-green-500 shadow-lg'
                      : 'bg-green-600 text-white hover:bg-green-700'
                    }
                  `}
                >
                  📚 My Pokémon
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      {/* MAIN CONTENT - This is where each page's content goes */}
      <main className="flex-grow container mx-auto px-4 py-8">
        {children}
      </main>

      {/* FOOTER */}
      <footer className="bg-gray-800 text-white py-6 mt-auto">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm">
            Made with ❤️ for Aza
          </p>
          <p className="text-xs text-gray-400 mt-2">
            PokéMaker - Create your own Pokémon adventures!
          </p>
        </div>
      </footer>
    </div>
  );
}

export default Layout;
