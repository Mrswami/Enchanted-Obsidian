// Ironclad Pipeline: HSM-Backed Provisioning
param location string = resourceGroup().location
param vaultName string = 'iv-${uniqueString(resourceGroup().id)}'
param keyName string = 'ironclad-signing-key'

// 1. Managed Identity for the Firebase/Azure Bridge
resource ironcladIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: 'ironclad-orchestrator-id'
  location: location
}

// 2. Azure Key Vault (Premium SKU for HSM Support, Modern RBAC)
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: vaultName
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'premium' // Required for HSM-backed keys
    }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true // AZ-900 Standard: Role-Based Access Control
    enabledForDeployment: true
    enabledForTemplateDeployment: true
  }
}

// 2.5 Role Assignment: Key Vault Crypto User (Allows Signing)
// Role GUID for Key Vault Crypto User: 12338af0-0e69-4776-bea7-57ae8d297424
resource keyVaultRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, ironcladIdentity.id, '12338af0-0e69-4776-bea7-57ae8d297424')
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '12338af0-0e69-4776-bea7-57ae8d297424')
    principalId: ironcladIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

// 3. HSM-Backed RSA Key
resource signingKey 'Microsoft.KeyVault/vaults/keys@2023-07-01' = {
  parent: keyVault
  name: keyName
  properties: {
    kty: 'RSA-HSM' 
    keySize: 2048
    attributes: {
      enabled: true
    }
  }
}

output vaultUri string = keyVault.properties.vaultUri
output identityClientId string = ironcladIdentity.properties.clientId
