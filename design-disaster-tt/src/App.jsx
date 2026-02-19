import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import OrderMenu from "./pages/OrderMenu";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/order-menu" element={<OrderMenu />} />
    </Routes>
  );
}

export default App;
