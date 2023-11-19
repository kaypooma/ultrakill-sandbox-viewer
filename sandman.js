import Logger from './logger';
import SandboxObject from './sandboxobject';

const Log_SMan = new Logger("SandboxManager");


const SandboxManager = class SandboxManager {
    map;

    saveInfo;
    blocks = [];
    props = [];
    enemies = [];

    constructor() {
        this.map = {};
    }

    loadMap(map) {
        this.map = {};
        this.saveInfo = null;
        this.blocks = [];
        this.props = [];
        this.enemies = [];

        Log_SMan.Info("Parsing save data");
        this.map = map;

        // log the map info and save version info
        this.saveInfo = {
            'MapName': map.MapName,
            'MapIdentifier': map.MapIdentifier,
            'SaveVersion': map.SaveVersion,
            'GameVersion': map.GameVersion
        };

        Log_SMan.Info(`Map: ${map.MapName}`);
        Log_SMan.Info(`Save Version: ${map.SaveVersion}, Game Version: ${map.GameVersion}`);

        if (this.map.Blocks != null) {
            for (var blockData of this.map.Blocks) {
                let sboxobj = new SandboxObject(blockData, 'block');
                this.blocks.push(sboxobj);
            }
        }

        if (this.map.Props != null) {
            for (var propData of this.map.Props) {
                let sboxobj = new SandboxObject(propData, 'prop');
                this.props.push(sboxobj);
            }
        }

        if (this.map.Enemies != null) {
            for (var enemyData of this.map.Enemies) {
                let sboxobj = new SandboxObject(enemyData, 'enemy');
                this.enemies.push(sboxobj);
            }
        }
    }

    getBlocks() {
        return this.blocks;
    }
    getProps() {
        return this.props;
    }
    getEnemies() {
        return this.enemies;
    }

    addObject( type, id ) {
        Log_SMan.Info("Adding object");
        let newObj = new SandboxObject(null, type, id);

        switch(type) {
            case "block":
                this.blocks.push(newObj);
                break;
            case "enemy":
                this.enemies.push(newObj);
                break;
            case "prop":
                this.props.push(newObj);
                break;
        }
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
        let mapData = {
            'Blocks': [],
            'Props': [],
            'Enemies': []
        }
        Object.assign(mapData, this.saveInfo);

        // PITRify blocks
        for (let block of this.blocks) {
            mapData.Blocks.push(block.getPITRData());
        }

        // PITRify props
        for (let prop of this.props) {
            let PITRprop = prop.getPITRData();
            mapData.Props.push(PITRprop);
        }

        // PITRify enemies
        for (let enemy of this.enemies) {
            let PITRenemy = enemy.getPITRData();
            mapData.Enemies.push(PITRenemy);
        }

        return JSON.stringify(mapData);
    }
}

export default SandboxManager;
