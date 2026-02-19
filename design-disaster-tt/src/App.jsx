import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import OrderMenu from "./pages/OrderMenu";
import Menu from "./pages/Menu";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/order-menu" element={<OrderMenu />} />
      <Route path="/menu" element={<Menu />} />
    </Routes>
  );
}

export default App;
