import React from 'react';
import './GoBoard.css';

export class GoIntersectionState {
    constructor() {
        this.stone = null;
        this.number = null;
        this.winrate = null;
        this.playouts = null;
        this.backgroundColor = null;
        this.borderWidth = null;
        this.borderColor = null;
    }
}

function range(start, end) {
    const result = [];
    if (start <= end) {
        for (let i = start; i <= end; i++) {
            result.push(i);
        }
    } else {
        for (let i = start; i >= end; i--) {
            result.push(i);
        }
    }
    return result;
}

class GoBoard extends React.Component {
    index(x, y) {
        return this.props.w * (y - 1) + x - 1;
    }

    /*, number, winrate, visits, backgroundColor, borderColor) {

    }*/

    renderIntersection(x, y) {
        const intersection = this.props.intersections[this.index(x, y)];
        return (
            <GoIntersection
                key={`${x}-${y}`}
                onClick={() => this.props.onClickIntersection(x, y)}
                onMouseEnter={() => this.props.onMouseEnterIntersection(x, y)}
                onMouseLeave={() => this.props.onMouseLeaveIntersection(x, y)}
                stone={intersection.stone}
                number={intersection.number}
                winrate={intersection.winrate}
                playouts={intersection.playouts}
                backgroundColor={intersection.backgroundColor}
                borderColor={intersection.borderColor}
            />
        );
    }

    render() {
        const goBoardStyle = {
            width: this.props.width,
            height: this.props.height,
        };
        return (
            <div className="go-board" style={goBoardStyle}>
            <div className="go-board-content">
                {range(parseInt(this.props.h), 1).map(y => (
                    <div className="go-row" key={y}>
                        {range(1, parseInt(this.props.w)).map(x => this.renderIntersection(x, y))}
                    </div>
                ))}
            </div>
            </div>
        );
    }
}

class GoIntersection  extends React.PureComponent {
    constructor(props) {
        super(props);
    }

    render() {
        let url;
        switch (this.props.stone) {
            case "B":
            url = "url(https://storage.googleapis.com/mimiaka-storage/mimiaka/public/images/nachiguro2.png)";
            break;
            case "W":
            url = "url(https://storage.googleapis.com/mimiaka-storage/mimiaka/public/images/hamaguri2.png)";
            break;
            default:
            url = null;
        }
        const intersectionStyle = {
            backgroundImage: url,
            backgroundColor: this.props.backgroundColor,
            borderWidth: this.props.borderWidth,
            borderColor: this.props.borderColor,
        }
        const numberStyle = {
            color: this.props.stone === "B" ? "white" : "black",
        }
        return (
            <div className="go-intersection" style={intersectionStyle} onClick={this.props.onClick} onMouseEnter={this.props.onMouseEnter} onMouseLeave={this.props.onMouseLeave}>
                <div className="go-intersection-number" style={numberStyle}>{this.props.number}</div>
                <div className="go-intersection-info">
                    <div>{this.props.winrate}</div>
                    <div>{this.props.playouts}</div>
                </div>
            </div>
        );
    }
}

export default GoBoard;
