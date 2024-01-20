import { BrowserRouter, Routes, Route } from 'react-router-dom';
import RedactReports from './redact';
import ModerateReports from './moderate';
import ReviewReports from './review';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/redact" element={<RedactReports />} />
        <Route path="/moderate" element={<ModerateReports />} />
        <Route path="/review" element={<ReviewReports />} />
        {/* You can add more routes here */}
      </Routes>
    </BrowserRouter>
  );
}


export default App;
