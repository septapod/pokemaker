/**
 * App.tsx - Main Application Component
 *
 * This is the root component of the PokéMaker app.
 * It sets up routing using React Router, which allows navigation between different pages.
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import Home from './pages/Home';
import CreatePokemon from './pages/CreatePokemon';
import Gallery from './pages/Gallery';
import PokemonDetail from './pages/PokemonDetail';
import EditPokemon from './pages/EditPokemon';

function App() {
  return (
    // Router enables navigation between pages without refreshing the browser
    <Router>
      {/* Layout wraps all pages and provides the header/navigation */}
      <Layout>
        {/* Routes define which component shows for each URL path */}
        <Routes>
          {/* Home page - path: / */}
          <Route path="/" element={<Home />} />

          {/* Create a new Pokémon - path: /create */}
          <Route path="/create" element={<CreatePokemon />} />

          {/* View all Pokémon in a gallery - path: /gallery */}
          <Route path="/gallery" element={<Gallery />} />

          {/* View details of a specific Pokémon - path: /pokemon/:id */}
          <Route path="/pokemon/:id" element={<PokemonDetail />} />

          {/* Edit an existing Pokémon - path: /pokemon/:id/edit */}
          <Route path="/pokemon/:id/edit" element={<EditPokemon />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
