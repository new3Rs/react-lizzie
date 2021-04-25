import React from "react";
import Modal from 'react-modal';
import GoAI from "./GoAI";

const App = () => {
  let gtp = "katago";
  const customStyles = {
    content: {
      top: '50%',
      left: '50%',
      right: 'auto',
      bottom: 'auto',
      marginRight: '-50%',
      transform: 'translate(-50%, -50%)'
    }
  };
  const [modalIsOpen,setIsOpen] = React.useState(true);

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
      <Modal isOpen={modalIsOpen} style={customStyles}>
          <h2>ウェブ版囲碁の師匠</h2>
      </Modal>
    </div>
  );
};

export default App;
