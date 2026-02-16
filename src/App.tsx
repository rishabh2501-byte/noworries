/**
 * Main Application Component
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import InputScreen from './components/InputScreen';
import ResultsScreen from './components/ResultsScreen';
import SettingsScreen from './components/SettingsScreen';
import LocatorScreen from './components/LocatorScreen';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<InputScreen />} />
          <Route path="/locators" element={<LocatorScreen />} />
          <Route path="/results" element={<ResultsScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
