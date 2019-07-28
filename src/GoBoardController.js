import React from 'react';
import ReactDOM from 'react-dom';
import GoBoard, { GoIntersectionState } from './GoBoard';
import { Board } from './board';
import { BoardConstants, IntersectionState } from './board_constants'

function board2intersections(board) {
    const intersections = new Array(board.C.BVCNT);
    for (let i = 0; i < intersections.length; i++) {
        const intersection  = new GoIntersectionState();
        switch (board.state[board.C.rv2ev(i)]) {
            case IntersectionState.BLACK:
            intersection.stone = "B";
            break;
            case IntersectionState.WHITE:
            intersection.stone = "W";
            break;
            default:
        }
        intersections[i] = intersection;
    }
    return intersections;
}

class GoBoardController {
    constructor() {

    }
    
    start(size) {
        this.model = new Board(new BoardConstants(19));
        this.view = ReactDOM.render(<GoBoard width="500px" height="500px" w={size} h={size} onClickIntersection={(x, y) => this.handleClick(x, y)} />, document.getElementById('root'));
    }

    handleClick(x, y) {
        try {
            this.model.play(this.model.C.xy2ev(x, y));
            this.view.setState({
                intersections: board2intersections(this.model),
            });
        } catch (e) {
            console.log(e);
        }
    }
}

export default GoBoardController;
