// used for the visual in page log element
// that is used to display a number of warnings and errors if any
// and show all entries without the need of pulling up the dev console
const LogManager = class LogManager {
    numError
    numWarning
    logEntries

    constructor() {
        this.numError = 0
        this.numWarning = 0
        this.logEntries = []
    }

    addEntry(msg, type = "unknown") {
        switch(type) {
            case "warning":
                this.numWarning++
                console.warn(msg)
                break
            case "error":
                this.numError++
                console.error(msg)
                break
            default:
                console.log(msg)
                break
        }
        
        this.updateGUI()
    }

    updateGUI() {
        if (this.numError > 0 || this.numWarning > 0) {
            document.getElementById("loginf-notice").style.display = "block"
        }
        document.getElementById("log-wcount").innerText = this.numWarning
        document.getElementById("log-ecount").innerText = this.numError
    }
}

// only one log manager exists in the page and is global
global.logManager = new LogManager()

// loggers that call the global log manager but can exist multiple times fine
const Logger = class Logger {
    channelName

    constructor(name) {
        this.channelName = name
    }

    Log(msg, type = "unknown") {
        let prefix = "*"
        let color = "white"

        switch(type) {
            case "info":
                prefix = "I"
                color = "blue"
                break
            case "warning":
                prefix = "W"
                color = "yellow"
                break
            case "error":
                prefix = "E"
                color = "red"
                break
        }

        let fullstr = `[${this.channelName}][${prefix}] ${msg}`
        global.logManager.addEntry(fullstr, type)
    }

    Info(msg) {
        this.Log(msg, "info")
    }

    Error(msg) {
        this.Log(msg, "error")
    }

    Warn(msg) {
        this.Log(msg, "warning")
    }
}

export { Logger }