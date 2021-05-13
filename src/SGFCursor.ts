class SGFCursor {
    collection: any[];
    current?: any;
    history: any[] = [];
    get moveNumber(): number {
        return this.history.length;
    }

    constructor(collection: any) {
        this.collection = collection;
        this.current = collection[0];
    }

    forward(child: number = 0): any {
        if (this.current == null) {
            if (child < this.collection.length) {
                this.current = this.collection[child];
                return this.current;
            } else {
                return undefined;
            }
        } else {
            if (child < this.current._children.length) {
                this.history.push(this.current);
                this.current = this.current._children[child];
                return this.current;
            } else {
                return undefined;
            }
        }
    }

    back(): any {
        const node = this.history.pop();
        if (node == null) {
            return undefined;
        } else {
            this.current = node;
            return this.current;
        }
    }

    toTop() {
        this.history = [];
        this.current = this.collection[0];
    }

    play(color: string, value: string) {
        if (this.current == null) {
            return;
        }

        const i = this.current._children.findIndex((e: any) => e[color][0] === value);
        if (i >= 0) {
            this.forward(i);
        } else if (this.current._children.length > 0 && this.current._children.every((e: any) => e["B"] == null && e["W"] == null)) {
            this.forward();
            this.play(color, value);
        } else {
            this.history.push(this.current);
            const node: { [name: string]: any } = { _children: [] };
            node[color] = [value];
            this.current._children.push(node);
            this.current = node;
        }
    }

    hasNext(): boolean {
        if (this.current == null) {
            return false;
        }
        return this.current._children.length > 0;
    }

    hasParent(): boolean {
        return this.history.length === 0;
    }

    removeCurrent(): any {
        const c = this.current;
        if (this.back() == null) {
            return null;
        }
        const i = this.current._children.indexOf(this.current);
        this.current._children.splice(i, 1);
        return c;
    }
}

export default SGFCursor;