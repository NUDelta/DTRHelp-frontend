import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import PairConnect from "./PairConnect";
import MessageBoard from "./MessageBoard";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/pair-connect" element={<PairConnect />} />
        <Route path="/board" element={<MessageBoard />} />
        <Route path="*" element={<Navigate to="/board" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
