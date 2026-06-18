import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import EditGalleryPage from './pages/EditGalleryPage';
import EditPuzzlePage from './pages/EditPuzzlePage';
import PlayPage from './pages/PlayPage';
import { usePublishedIds } from './hooks/usePublishedIds';
import { DEFAULT_PUZZLE_ID } from './utils/puzzleIds';

function HomeRedirect() {
  const { ids, loading } = usePublishedIds();
  if (loading) return null;
  const latest = ids.length > 0 ? ids[ids.length - 1] : DEFAULT_PUZZLE_ID;
  return <Navigate to={`/${latest}`} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/edit" element={<EditGalleryPage />} />
        <Route path="/edit/:editId" element={<EditPuzzlePage />} />
        <Route path="/:puzzleId" element={<PlayPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
