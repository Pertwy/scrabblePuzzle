import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import EditPage from './pages/EditPage';
import PlayPage from './pages/PlayPage';
import { DEFAULT_PUZZLE_ID } from './utils/puzzleIds';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<Navigate to={`/${DEFAULT_PUZZLE_ID}`} replace />}
        />
        <Route path="/edit" element={<EditPage />} />
        <Route path="/:puzzleId" element={<PlayPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
