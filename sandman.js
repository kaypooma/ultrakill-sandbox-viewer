const SandboxManager = class SandboxManager {
    map

    constructor() {
        this.map = {}
    }

    loadMap(map) {
        this.map = map
    }

    getBlocks() {
        return this.map.Blocks
    }
    getProps() {
        return this.map.Props
    }

    updateObject( type, oldData, newData ) {
        let nmap = {
            'block': 'Blocks',
            'prop': 'Props',
            'enemy': 'Enemies'
        }
        let array = this.map[ nmap[type] ]
        let index = array.indexOf( oldData )

        array[index] = newData
    }
    removeObject ( type, data ) {
        let nmap = {
            'block': 'Blocks',
            'prop': 'Props',
            'enemy': 'Enemies'
        }
        let array = this.map[ nmap[type] ]
        let index = array.indexOf( data )
        
        array.splice(index, 1)
    }

    getMapData() {
        return JSON.stringify(this.map)
    }
}

export { SandboxManager }