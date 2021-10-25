import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import FabricCAServices from 'fabric-ca-client';
import {FileSystemWallet, Gateway, X509WalletMixin} from 'fabric-network';
import * as fs from 'fs';
import log4js from 'log4js';
import * as path from 'path';
import {MemoryDataSource} from '../datasources';
import {Transaction, TransactionRelations} from '../models';

// _____ DEFINE LOGGER _____
const logger = log4js.getLogger('Repository--->');
logger.level = 'DEBUG';

// _____ DEFINE BLOCKCHAIN PATH _____
const blcPath = path.join(__dirname, '..', '..', 'src', 'fabric');
const ccpPath = path.join(blcPath, 'connection-org1.json');
const walletPath = path.join(blcPath, 'wallet');
const channel_name = 'mychannel';
const chaincode_name = 'basic';
const caName = 'ca.org1.example.com';
const mspId = 'Org1MSP';

export class TransactionRepository extends DefaultCrudRepository<
  Transaction,
  typeof Transaction.prototype.id,
  TransactionRelations
> {
  constructor(
    @inject('datasources.memory') dataSource: MemoryDataSource,
  ) {
    super(Transaction, dataSource);
  }

  // _____ ENROLL ADMIN _____
  async enrollAdmin(): Promise<void> { // ca.org1.example.com,
    // 1. Load the network configuration (.json).
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    try {
      // 2. Assign adminId & adminPass.
      const adminId = 'admin';
      const adminPass = 'adminpw';

      // 3. Create a new CA client for interacting with the CA.
      const caInfo = ccp.certificateAuthorities[caName];
      const caTLSCACerts = caInfo.tlsCACerts.pem;
      const ca = new FabricCAServices(
        caInfo.url,
        {trustedRoots: caTLSCACerts, verify: false},
        caInfo.caName,
      );
      logger.debug('enrollAdmin - caInfo: %o', caInfo);

      // 4. Create a new file system based wallet for managing identities.
      const wallet = new FileSystemWallet(walletPath);
      logger.debug('enrollAdmin - Wallet path: %s', walletPath);

      // 5. Check to see if we've already enrolled the admin user.
      const adminExists = await wallet.exists(adminId);
      if (adminExists) {
        throw new Error(
          'An identity for the admin already exist in the wallet',
        );
      }

      // 6. Enroll the admin user.
      const enrollment = await ca.enroll({
        enrollmentID: adminId,
        enrollmentSecret: adminPass,
      });
      const identity = X509WalletMixin.createIdentity(
        mspId,
        enrollment.certificate,
        enrollment.key.toBytes(),
      );

      // 7. Import the new identity into the wallet.
      await wallet.import(adminId, identity);
      logger.debug(
        'enrollAdmin - Successfully enrolled admin user and imported it into the wallet',
      );

    } catch (err) {
      throw new HttpErrors.BadRequest(err.message);
    }
  }


  // _____ REGISTER USER _____
  async registerUser(identity: string): Promise<void> {
    try {
      // 1. Assign adminId & adminPass
      const adminId = 'admin';
      const enrollmentID = identity;

      // 2. Create a new file system based wallet for managing identities.
      const wallet = new FileSystemWallet(walletPath);
      logger.debug('registerUser - Wallet path: %s', walletPath);

      // 3. Check to see if we've already enrolled the user,
      // IN THIS CASE, NO 2 ADDRESS CAN EVER BE THE SAME.
      const userExists = await wallet.exists(enrollmentID);
      if (userExists) {
        throw new Error(
          'An identity for the user already exists in the wallet',
        );
      }

      // 4. Check to see if we've already enrolled the admin user.
      const adminExists = await wallet.exists(adminId);
      if (!adminExists) {
        throw new Error(
          'An identity for the admin does not exist in the wallet',
        );
      }

      // 5. Create a new gateway for connecting to our peer node.
      const gateway = new Gateway();
      await gateway.connect(ccpPath, {
        wallet,
        identity: adminId,
        discovery: {enabled: true, asLocalhost: true},
      });

      // 6. Get the CA client object from the gateway for interacting with the CA.
      const ca = gateway.getClient().getCertificateAuthority();
      const adminIdentity = gateway.getCurrentIdentity();

      // 7. Assign User Information.
      // const attr1 = {name: 'username', value: enrollmentID, ecert: true};
      // const attr2 = {name: 'role', value: 'user', ecert: true};
      // const attrsArray = [attr1, attr2];

      // 8. Register the user.
      const secret = await ca.register(
        {
          // affiliation: `${orgName.toLowerCase()}.department1`,
          affiliation: `org1.department1`,
          enrollmentID: enrollmentID,
          // attrs: attrsArray
        },
        adminIdentity,
      );

      // 9. Enroll the user.
      const enrollment = await ca.enroll({
        enrollmentID: enrollmentID,
        enrollmentSecret: secret,
      });
      const userIdentity = X509WalletMixin.createIdentity(
        mspId,
        enrollment.certificate,
        enrollment.key.toBytes(),
      );

      // 10. Import the new identity into the wallet.
      await wallet.import(enrollmentID, userIdentity);
      logger.debug(
        'registerUser - Successfully registered and enrolled the user and imported it into the wallet',
      );

      // 11. Disconnect gateway.
      gateway.disconnect();

    } catch (err) {
      throw new HttpErrors.BadRequest(err.message);
    }
  }

  // _____ QUERY _____
  async query(transaction: Transaction): Promise<Buffer> {
    try {
      // 1. Assign infor of channel, chaincode, identidy, fcn, args.
      const channel = channel_name;
      const chaincode = chaincode_name;
      const identity = transaction.identity;
      const fcn = transaction.fcn;
      const args = transaction.args ?? '';

      // 2. Create a new file system based wallet for managing identities.
      const wallet = new FileSystemWallet(walletPath);
      logger.debug('query - Wallet path: %s', walletPath);

      // 3. Check to see if we've already enrolled the user.
      const userExists = await wallet.exists(identity);
      if (!userExists) {
        throw new Error(
          'An identity for the user does not exist in the wallet',
        );
      }

      // 4. Create a new gateway for connecting to our peer node.
      const gateway = new Gateway();
      await gateway.connect(ccpPath, {
        wallet,
        identity: identity,
        discovery: {enabled: true, asLocalhost: false},
      });

      // 5. Get the network (channel) our contract is deployed to.
      const network = await gateway.getNetwork(channel);

      // 6. Get the contract from the network.
      const contract = network.getContract(chaincode);

      // 7. Evaluate the specified transaction.
      const result = await contract.evaluateTransaction(fcn, ...args);
      logger.debug(
        `query - Transaction has been evaluated, result is: ${result.toString()}`,
      );

      // 8. Disconnect gateway.
      gateway.disconnect();

      return result;

    } catch (err) {
      throw new HttpErrors.BadRequest(err.message);
    }
  }
}
