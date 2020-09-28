import React from "react";
import GoAI from "./GoAI";

const App = () => {
  let gtp = "katago";
  if (window.location.search.startsWith("?")) {
    const assigns = window.location.search.substr(1).split("&");
    for (const assign of assigns) {
      const tokens = assign.split("=");
      if (tokens[0] === "gtp") {
        gtp = tokens[1];
      }
    }
  }
  return (
    <div>
      <GoAI gtp={gtp} />
    </div>
  );
};

export default App;
