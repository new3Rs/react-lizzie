import React from "react";
import Modal from 'react-modal';
import GoAI from "./GoAI";

Modal.setAppElement("#app-container");

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
  function closeModal(){
    setIsOpen(false);
  }
  const [size,setSize] = React.useState(19);
  function changeSize(event: React.ChangeEvent<HTMLInputElement>) {
    setSize(parseInt(event.currentTarget.value));
  }

  if (window.location.search.startsWith("?")) {
    const assigns = window.location.search.substr(1).split("&");
    for (const assign of assigns) {
      const tokens = assign.split("=");
      if (tokens[0] === "gtp") {
        gtp = tokens[1];
      }
    }
  }
  return modalIsOpen ? (
    <Modal isOpen={modalIsOpen} style={customStyles}>
      <h2>ウェブ版囲碁の師匠</h2>
      <form action="">
        <input type="radio" name="size" id="size1" value="9" onChange={changeSize} />
        <label htmlFor="size1">9</label>
        <input type="radio" name="size" id="size2" value="13" onChange={changeSize} />
        <label htmlFor="size1">13</label>
        <input type="radio" name="size" id="size3" value="19" onChange={changeSize} />
        <label htmlFor="size1">19</label>
        <button type="button" onClick={closeModal}>スタート！</button>
      </form>
    </Modal>
  ) :       <GoAI gtp={gtp} size={size} />

};

export default App;
