/**
 * OrderMenu Page
 * ---------------
 * Entry point for the interactive chef word-game scene.
 * Imports the animations CSS and delegates everything to GameController.
 */

import GameController from "./OrderMenu/GameController";
import "./OrderMenu/animations.css";

function OrderMenu() {
  return <GameController />;
}

export default OrderMenu;
