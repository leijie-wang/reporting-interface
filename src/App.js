import { BrowserRouter, Routes, Route } from 'react-router-dom';
import RedactReports from './redact';
import ReviewReports from './review';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/redact" element={<RedactReports />} />
        <Route path="/review" element={<ReviewReports />} />
        {/* You can add more routes here */}
      </Routes>
    </BrowserRouter>
  );
}


export default App;
