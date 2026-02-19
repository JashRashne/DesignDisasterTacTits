import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import OrderMenu from "./pages/OrderMenu";
import Menu from "./pages/Menu";
import OrderStatus from "./pages/OrderStatus";
import SelectIngredients from "./pages/SelectIngredients";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/order-menu" element={<OrderMenu />} />
      <Route path="/menu" element={<Menu />} />
      <Route path="/order-status" element={<OrderStatus />} />
      <Route path="/select-ingredients" element={<SelectIngredients />} />
    </Routes>
  );
}

export default App;
