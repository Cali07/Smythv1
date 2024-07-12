import { SREConnectorConfig, TConnectorService, TServiceRegistry } from '@sre/types/SRE.types';
import { DummyConnector } from './DummyConnector';
import { createLogger } from './Logger';
import { Connector } from './Connector.class';
import { isSubclassOf } from '@sre/utils';
import SystemEvents from './SystemEvents';
const console = createLogger('ConnectorService');

const Connectors = {};

const ConnectorInstances: any = {};
let ServiceRegistry: TServiceRegistry = {};
let _ready = false;
SystemEvents.on('SRE:Booted', (services) => {
    ServiceRegistry = services;
    _ready = true;
});
export class ConnectorService {
    //Singleton
    // private constructor() {
    //     SystemEvents.on('SRE:Booted', (services) => {
    //         ServiceRegistry = services;
    //     });
    // }
    // private static instance: ConnectorService;
    // public static get Instance(): ConnectorService {
    //     if (!ConnectorService.instance) {
    //         ConnectorService.instance = new ConnectorService();
    //     }
    //     return ConnectorService.instance;
    // }
    public static get ready() {
        return _ready;
    }

    public static get service(): TServiceRegistry {
        return ServiceRegistry;
    }
    /**
     * Allows SRE services to register their connectors, a registered conector can then be initialized and used by SRE or its services
     * @param connectorType
     * @param connectorName
     * @param connectorConstructor
     * @returns
     */
    static register(connectorType: TConnectorService, connectorName: string, connectorConstructor: any) {
        if (typeof connectorConstructor !== 'function' || !isSubclassOf(connectorConstructor, Connector)) {
            console.error(`Invalid Connector ${connectorType}:${connectorName}`);
            return;
        }
        if (!Connectors[connectorType]) {
            Connectors[connectorType] = {};
        }
        Connectors[connectorType][connectorName] = connectorConstructor;
    }

    /**
     * The init method instantiates a connector and starts it, a connector cannot be used before it is initialized
     * Usually the initialization phase happens during the SRE startup, but some connectors can be initialized later if they are not mandatory for the SRE to start
     *
     *
     * @param connectorType
     * @param connectorName
     * @param settings
     * @param isDefault
     * @returns
     */
    static init(connectorType: TConnectorService, connectorName: string, settings: any = {}, isDefault = false) {
        if (ConnectorInstances[connectorType]?.[connectorName]) {
            throw new Error(`Connector ${connectorType}:${connectorName} already initialized`);
        }

        const entry = Connectors[connectorType];
        if (!entry) return;
        const connectorConstructor = entry[connectorName];

        if (connectorConstructor) {
            const connector: Connector = new connectorConstructor(settings);

            connector.start();
            if (!ConnectorInstances[connectorType]) ConnectorInstances[connectorType] = {};
            ConnectorInstances[connectorType][connectorName] = connector;

            if (!ConnectorInstances[connectorType].default && isDefault) {
                ConnectorInstances[connectorType].default = connector;
            }
        }
    }
    static async _stop() {
        for (let connectorName in ConnectorInstances) {
            let allConnectors: Connector[] = Object.values(ConnectorInstances[connectorName]);
            //deduplicate
            allConnectors = allConnectors.filter((value, index, self) => self.indexOf(value) === index);
            for (let connector of allConnectors) {
                connector.stop();
            }
        }
    }
    static getInstance<T>(connectorType: TConnectorService, connectorName: string = 'default'): T {
        const instance = ConnectorInstances[connectorType]?.[connectorName] as T;
        if (!instance) {
            if (ConnectorInstances[connectorType] && Object.keys(ConnectorInstances[connectorType]).length > 0) {
                //return the first instance
                return ConnectorInstances[connectorType][Object.keys(ConnectorInstances[connectorType])[0]] as T;
            }
            console.warn(`Connector ${connectorType} not initialized returning DummyConnector`);
            return DummyConnector as T;
        }
        return instance;
    }

    static hasInstance(connectorType: TConnectorService, connectorName: string = 'default') {
        const instance = ConnectorInstances[connectorType]?.[connectorName];
        return instance && instance !== DummyConnector;
    }
}

export abstract class ConnectorServiceProvider {
    public abstract register();
    public init() {}
    public constructor() {
        this.register();
    }
}
