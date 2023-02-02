import { AbstractConnector } from "@web3-react/abstract-connector";
import { ConnectorUpdate } from "@web3-react/types";
import {
  UniPassProvider,
  UniPassProviderOptions,
} from "@unipasswallet/ethereum-provider";
import { UPAccount } from "@unipasswallet/popup-types";

export interface UniPassConstructorArgs extends UniPassProviderOptions {
  supportedChainIds?: number[];
}

export class UserRejectedRequestError extends Error {
  public constructor() {
    super();
    this.name = this.constructor.name;
    this.message = "The user rejected the request.";
  }
}

export class UniPassConnector extends AbstractConnector {
  public unipassProvider?: UniPassProvider;
  public upAccount?: UPAccount;
  private readonly config: UniPassConstructorArgs;

  constructor(config: UniPassConstructorArgs) {
    super({ supportedChainIds: config.supportedChainIds });
    this.config = config;
    this.handleChainChanged = this.handleChainChanged.bind(this);
    this.handleDisconnect = this.handleDisconnect.bind(this);
  }

  private handleChainChanged(chainId: number | string): void {
    this.emitUpdate({ chainId });
  }

  private async handleDisconnect() {
    if (this.unipassProvider) {
      await this.unipassProvider.disconnect();
      this.unipassProvider.removeListener(
        "chainChanged",
        this.handleChainChanged
      );
      this.unipassProvider = undefined;
    }
    this.emitDeactivate();
  }

  public async activate(): Promise<ConnectorUpdate<string | number>> {
    if (!this.unipassProvider) {
      this.unipassProvider = new UniPassProvider(this.config);
    }
    try {
      const account = await this.unipassProvider.connect();
      this.upAccount = account;
      this.unipassProvider.on("disconnect", this.handleDisconnect);
      this.unipassProvider.on("chainChanged", this.handleChainChanged);
      return { provider: this.unipassProvider, account: account.address };
    } catch {
      throw new UserRejectedRequestError();
    }
  }

  public async getProvider(): Promise<any> {
    return this.unipassProvider;
  }

  public async getChainId(): Promise<string | number> {
    return Promise.resolve(this.unipassProvider?.getChainId() || "");
  }

  public async getAccount(): Promise<string> {
    return Promise.resolve(this.upAccount?.address || "");
  }

  public deactivate(): void {
    if (this.unipassProvider) {
        this.unipassProvider.removeListener('disconnect', this.handleDisconnect)
        this.unipassProvider.removeListener('chainChanged', this.handleChainChanged)
        this.unipassProvider.disconnect()
      }
  }
}
