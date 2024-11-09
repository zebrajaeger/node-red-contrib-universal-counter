module.exports = function(RED) {
    function UniversalCounterNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        // Node configuration
        this.range = parseRange(config.range); // Expects parseRange function to handle range parsing
        this.initialValue = parseInt(config.initialValue);
        this.index = this.range.indexOf(this.initialValue); // Set initial index
        // console.log('gggg', this.index)
        // Status display
        if (this.index === -1) {
            node.status({fill: "red", shape: "ring", text: `Invalid initial value: '${config.initialValue}'`});
            node.error("Initial value not in range");
            return;
        } else {
            node.status({fill: "green", shape: "dot", text: `i:${this.index} v:${this.range[this.index]}`});
        }

        // Load the stored index from the context if available
        this.index = this.context().get('index') || this.index;

        this.on('input', function(msg) {
            let oldIndex = this.index;

            // Topic-based routing
            switch (msg.topic) {
                case 'r':
                case 'res':
                case 'reset':
                    this.index = 0;
                    break;

                case 'v':
                case 'val':
                case 'setValue':
                    if (this.range.includes(msg.payload)) {
                        this.index = this.range.indexOf(msg.payload);
                    } else {
                        node.warn(`Value ${msg.payload} not in range. Allowed: ${this.range}`);
                    }
                    break;

                case 'i':
                case 'idx':
                case 'setIndex':
                    if (msg.payload >= 0 && msg.payload < this.range.length) {
                        this.index = msg.payload;
                    } else {
                        node.warn(`Index out of range. Min: ${0}, max: ${this.range.length-1}`);
                    }
                    break;

                case 'inc':
                case '++':
                case 'increment':
                    // Use msg.payload as step size if provided, otherwise default to 1
                    let incrementStep = (typeof msg.payload === 'number') ? msg.payload : 1;
                    this.index = (this.index + incrementStep) % this.range.length;
                    if (this.index < 0) this.index += this.range.length; // Correct for negative modulo
                    break;

                case 'dec':
                case '--':
                case 'decrement':
                    // Use msg.payload as step size if provided, otherwise default to 1
                    let decrementStep = (typeof msg.payload === 'number') ? msg.payload : 1;
                    this.index = (this.index - decrementStep + this.range.length) % this.range.length;
                    if (this.index < 0) this.index += this.range.length; // Correct for negative modulo
                    break;

                default:
                    node.warn(`Unknown topic: '${msg.topic}'`);
                    return; // No further processing for unknown topics
            }

            // Only output if the index has changed
            if (this.index !== oldIndex || msg.topic === 'reset') {
                node.send({payload: this.range[this.index]});
                node.status({fill: "green", shape: "dot", text: `i:${this.index} v:${this.range[this.index]}`});
            }

            // Save the index in the context
            this.context().set('index', this.index);
        });

        function parseRange(rangeStr) {
            const values = [];
            const parts = rangeStr.split(',');
            parts.forEach(part => {
                const rangeMatch = part.match(/^(\d+)\.\.(\d+)$/);
                if (rangeMatch) {
                    const start = parseInt(rangeMatch[1], 10);
                    const end = parseInt(rangeMatch[2], 10);
                    for (let i = start; i <= end; i++) {
                        values.push(i);
                    }
                } else if (!isNaN(part)) {
                    values.push(parseInt(part, 10));
                }
            });
            return values.length ? values : null;
        }
    }

    RED.nodes.registerType("universal-counter", UniversalCounterNode);
};
