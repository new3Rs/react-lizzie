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
    const [sgf, setSgf] = React.useState("(;FF[4]GM[1]SZ[9])");
    function changeSize(event: React.ChangeEvent<HTMLInputElement>) {
        setSgf(`(;FF[4]GM[1]SZ[${event.currentTarget.value}])`);
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

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const target = event.currentTarget;
        if (target.files == null || target.files.length === 0) {
                return;
        }
        const reader = new FileReader();
        reader.onload = async (event: Event) => {
                const target = event.target as any;
                setSgf(target.result);
        };
        reader.readAsText(target.files[0]);
    };

    return modalIsOpen ? (
        <Modal isOpen={modalIsOpen} style={customStyles}>
            <h2 style={{ textAlign: "center" }}>ウェブ版囲碁の師匠 v1.1</h2>
            <form action="">
                <div style={{ textAlign: "center" }}>
                    <input type="radio" name="size" id="size1" value="9" checked onChange={changeSize} />
                    <label htmlFor="size1">9</label>
                    <input type="radio" name="size" id="size2" value="13" onChange={changeSize} />
                    <label htmlFor="size1">13</label>
                    <input type="radio" name="size" id="size3" value="19" onChange={changeSize} />
                    <label htmlFor="size1">19</label>
                    <p><input type="file" name="sgf" onChange={handleChange} /></p>
                    <p><button type="button" onClick={closeModal}>スタート！</button></p>
                </div>
                <p>[お知らせ]</p>
                <p>Google Colabに関してSGFサポートを強化しました。ノートブックをコピーしてご利用の方は最新版をコピーし直してください</p>
            </form>
        </Modal>
    ) : <GoAI gtp={gtp} sgf={sgf} />

};

export default App;
