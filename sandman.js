import Logger from './logger';

const Log_SMan = new Logger("SandboxManager");


const SandboxManager = class SandboxManager {
    map;

    constructor() {
        this.map = {};
    }

    loadMap(map) {
        Log_SMan.Info("Loading map");
        this.map = map;
    }

    getBlocks() {
        return this.map.Blocks;
    }
    getProps() {
        return this.map.Props;
    }

    addObject( type, data ) {
        Log_SMan.Info("Adding object");

        let nmap = {
            'block': 'Blocks',
            'prop': 'Props',
            'enemy': 'Enemies'
        };

        if (nmap[type] == null) {
            Log_SMan.Error(`Type ${type} is not a valid object type.`);
            return;
        }

        let array = this.map[ nmap[type] ];

        // TODO: we should probably verify the data is correct for this object type
        array.push(data);
    }

    updateObject( type, oldData, newData ) {
        Log_SMan.Info("Updating object")
        let nmap = {
            'block': 'Blocks',
            'prop': 'Props',
            'enemy': 'Enemies'
        };
        let array = this.map[ nmap[type] ];
        let index = array.indexOf( oldData );

        // TODO: we should probably verify the data is correct for this object type
        array[index] = newData;
    }

    removeObject ( type, data ) {
        Log_SMan.Info("Removing object");
        let nmap = {
            'block': 'Blocks',
            'prop': 'Props',
            'enemy': 'Enemies'
        };
        let array = this.map[ nmap[type] ];
        let index = array.indexOf( data );

        array.splice(index, 1);
    }

    getMapData() {
        return JSON.stringify(this.map);
    }
}

export default SandboxManager;
