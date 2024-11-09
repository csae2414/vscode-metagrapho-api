// keycloakAuthenticationProvider.ts
import * as vscode from 'vscode';
import axios from 'axios';
import * as crypto from 'crypto';

export class KeycloakAuthenticationProvider implements vscode.AuthenticationProvider {
  public static readonly id = 'keycloak';
  private _sessionChangeEmitter = new vscode.EventEmitter<vscode.AuthenticationProviderAuthenticationSessionsChangeEvent>();
  public readonly onDidChangeSessions = this._sessionChangeEmitter.event;

  private context: vscode.ExtensionContext;
  private keycloakConfig = {
    realm: 'your-realm',
    clientId: 'vscode-extension',
    authServerUrl: 'https://your-keycloak-server/auth',
  };

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  async getSessions(): Promise<vscode.AuthenticationSession[]> {
    // Retrieve existing sessions from storage
    const storedSession = await this.context.secrets.get('keycloak-session');
    if (storedSession) {
      const sessionData = JSON.parse(storedSession);
      return [sessionData];
    }
    return [];
  }

  async createSession(scopes: readonly string[]): Promise<vscode.AuthenticationSession> {
    // Implement the OAuth2 authentication flow
    const tokenResponse = await this.performOAuthLogin();

    if (!tokenResponse) {
      throw new Error('Authentication failed');
    }

    const accessToken = tokenResponse.access_token;
    const refreshToken = tokenResponse.refresh_token;

    const session: vscode.AuthenticationSession = {
      id: 'keycloak-session',
      accessToken: accessToken,
      account: {
        label: 'Keycloak User',
        id: 'keycloak-user-id',
      },
      scopes: ['openid'],
    };

    // Store the session securely
    await this.context.secrets.store('keycloak-session', JSON.stringify(session));
    await this.context.secrets.store('keycloak-refresh-token', refreshToken);

    this._sessionChangeEmitter.fire({ added: [session], removed: [], changed: [] });
    return session;
  }

  async removeSession(sessionId: string): Promise<void> {
    // Remove the stored session
    await this.context.secrets.delete('keycloak-session');
    await this.context.secrets.delete('keycloak-refresh-token');
    this._sessionChangeEmitter.fire({ added: [], removed: [{ id: sessionId, scopes: [], account: { id: '', label: '' }, accessToken: '' }], changed: [] });
  }

  private async performOAuthLogin(): Promise<any> {
    // 1. Generate PKCE code verifier and challenge
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(codeVerifier);

    // 2. Construct the authorization URL
    const redirectUri = `${vscode.env.uriScheme}://${this.context.extension.id}`;
    const authorizationUrl =
      `${this.keycloakConfig.authServerUrl}/realms/${this.keycloakConfig.realm}/protocol/openid-connect/auth` +
      `?response_type=code` +
      `&client_id=${encodeURIComponent(this.keycloakConfig.clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&code_challenge=${encodeURIComponent(codeChallenge)}` +
      `&code_challenge_method=S256` +
      `&scope=openid`;

    // 3. Open the authorization URL in the user's browser
    await vscode.env.openExternal(vscode.Uri.parse(authorizationUrl));

    // 4. Handle the redirect URI
    const code = await this.handleAuthorizationResponse();

    if (!code) {
      throw new Error('Authorization code not received');
    }

    // 5. Exchange the authorization code for tokens
    const tokenUrl = `${this.keycloakConfig.authServerUrl}/realms/${this.keycloakConfig.realm}/protocol/openid-connect/token`;
    const tokenResponse = await axios.post(
      tokenUrl,
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.keycloakConfig.clientId,
        code: code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    return tokenResponse.data;
  }

  private generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private generateCodeChallenge(codeVerifier: string): string {
    const hash = crypto.createHash('sha256').update(codeVerifier).digest();
    return this.base64UrlEncode(hash);
  }

  private base64UrlEncode(buffer: Buffer): string {
    return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  private handleAuthorizationResponse(): Promise<string | undefined> {
    return new Promise((resolve, reject) => {
      const uriHandler = vscode.window.registerUriHandler({
        handleUri: (uri: vscode.Uri) => {
          const params = new URLSearchParams(uri.query);
          const code = params.get('code');
          resolve(code || undefined);
        },
      });
      // Set a timeout in case the user doesn't complete authentication
      setTimeout(() => {
        uriHandler.dispose();
        resolve(undefined);
      }, 60000); // 60 seconds
    });
  }
}
