import { IAgentDataConnector } from '@sre/AgentManager/AgentData/IAgentDataConnector';
import { Connector } from '@sre/Core/Connector.class';
import SmythRuntime from '@sre/Core/SmythRuntime.class';
import { TAccessLevel, TAccessResult, TAccessTicket } from '@sre/types/ACL.types';
import { ACL } from './AccessControl/ACL.class';
import { AccessRequest, AccessRequest } from './AccessControl/AccessRequest.class';
import { AccessCandidate } from './AccessControl/AccessCandidate.class';

//const _ConnectorAccessTokens = {};

export abstract class SecureConnector extends Connector {
    public abstract name: string;

    //this determines the access rights for the requested resource
    //the connector should check if the resource exists or not
    //if the resource exists we read it's ACL and return it
    //if the resource does not exist we return an write access ACL for the candidate
    public abstract getResourceACL(acRequest: AccessRequest): Promise<ACL>;

    public async start() {
        console.info(`Starting ${this.name} connector ...`);
    }

    public async stop() {
        console.info(`Stopping ${this.name} connector ...`);
    }

    private async hasAccess(acRequest: AccessRequest) {
        const aclHelper = await this.getResourceACL(acRequest);

        //const aclHelper = ACLHelper.from(acl);

        const exactAccess = aclHelper.checkExactAccess(acRequest);
        if (exactAccess) return true;

        // if the exact access is denied, we check if the candidate has a higher access
        const ownerRequest = AccessRequest.clone(acRequest).setLevel(TAccessLevel.Owner);
        const ownerAccess = aclHelper.checkExactAccess(ownerRequest);
        if (ownerAccess) return true;

        // if the exact access is denied, we check if the requested resource has a public access
        const publicRequest = AccessRequest.clone(acRequest).setCandidate(AccessCandidate.public());
        const publicAccess = aclHelper.checkExactAccess(publicRequest);
        if (publicAccess) return true;

        // if the public access is denied, we check if the candidate's team has access
        const agentDataConnector = SmythRuntime.Instance.AgentData as IAgentDataConnector;
        const teamId = await agentDataConnector.getCandidateTeam(acRequest.candidate);
        const teamRequest = AccessRequest.clone(acRequest).setCandidate(AccessCandidate.team(teamId));
        const teamAccess = aclHelper.checkExactAccess(teamRequest);
        if (teamAccess) return true;

        return false;
    }
    public async getAccessTicket(resourceId: string, request: AccessRequest): Promise<TAccessTicket> {
        const sysAcRequest = AccessRequest.clone(request).resource(resourceId);
        const accessTicket = {
            request,
            access: (await this.hasAccess(sysAcRequest)) ? TAccessResult.Granted : TAccessResult.Denied,
        };

        return accessTicket as TAccessTicket;
    }

    //#region [ Decorators ]==========================

    //AccessControl decorator
    //This decorator will inject the access control logic into storage connector methods
    // in order to work properly, the connector expects the resourceId to be the first argument and the access request to be the second argument

    static AccessControl(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        // Store the original method in a variable
        const originalMethod = descriptor.value;

        // Modify the descriptor's value to wrap the original method
        descriptor.value = async function (...args: any[]) {
            // Extract the method arguments
            const [resourceId, acRequest] = args;

            // Inject the access control logic
            const accessTicket = await this.getAccessTicket(resourceId, acRequest);
            if (accessTicket.access !== TAccessResult.Granted) throw new Error('Access Denied');

            // Call the original method with the original arguments
            return originalMethod.apply(this, args);
        };

        // Return the modified descriptor
        return descriptor;
    }

    //#endregion
}
