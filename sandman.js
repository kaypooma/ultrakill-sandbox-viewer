import Logger from './logger';
import SandboxObject from './sandboxobject';

const Log_SMan = new Logger("SandboxManager");


const SandboxManager = class SandboxManager {
    map;

    blocks = [];
    props = [];
    enemies = [];

    constructor() {
        this.map = {};
    }

    loadMap(map) {
        Log_SMan.Info("Parsing save data");
        this.map = map;

        for (var prop of this.map.Props) {
            let sboxobj = new SandboxObject(prop);
        }
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
        
        let newObj = new SandboxObject(null, data.ObjectIdentifier, type);
        this.props.push(newObj);

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
