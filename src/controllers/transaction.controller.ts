import {
  AnyObject,
  repository
} from '@loopback/repository';
import {
  getModelSchemaRef,
  post, requestBody
} from '@loopback/rest';
import log4js from 'log4js';
import {Transaction} from '../models';
import {TransactionRepository} from '../repositories';


const logger = log4js.getLogger('Controller--->');
logger.level = 'DEBUG';

export class TransactionController {
  constructor(
    @repository(TransactionRepository)
    public transactionRepository: TransactionRepository,
  ) { }

  // enrollAdmin
  @post('/transactions/enrolladmin')
  async enrollAdmin(): Promise<void> {
    logger.debug('enrollAdmin');
    return this.transactionRepository.enrollAdmin();
  }

  // registerUser
  @post('/transactions/register-user')
  async registerUser(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              identity: {type: 'string'},
            },
            required: ['identity'],
            additionalProperties: false,
          },
        },
      },
    })
    register: AnyObject,
  ): Promise<void> {
    logger.debug('registerUser: %o', register);
    return this.transactionRepository.registerUser(register.identity);
  }

  @post('/transactions/query', {
    responses: {
      '200': {
        description: 'Query transaction',
        // content: {'application/json': {schema: getModelSchemaRef(Transaction)}},
      },
    },
  })
  async query(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Transaction, {
            title: 'NewTransaction',
            exclude: ['id'],
          }),
        },
      },
    })
    transaction: Omit<Transaction, 'id'>,
  ): Promise<void> {
    logger.debug('query - transaction: %o', transaction);
    const buf = await this.transactionRepository.query(transaction);
    return JSON.parse(buf.toString());
  }

  // @post('/transactions')
  // @response(200, {
  //   description: 'Transaction model instance',
  //   content: {'application/json': {schema: getModelSchemaRef(Transaction)}},
  // })
  // async create(
  //   @requestBody({
  //     content: {
  //       'application/json': {
  //         schema: getModelSchemaRef(Transaction, {
  //           title: 'NewTransaction',
  //           exclude: ['id'],
  //         }),
  //       },
  //     },
  //   })
  //   transaction: Omit<Transaction, 'id'>,
  // ): Promise<Transaction> {
  //   return this.transactionRepository.create(transaction);
  // }

  // @get('/transactions/count')
  // @response(200, {
  //   description: 'Transaction model count',
  //   content: {'application/json': {schema: CountSchema}},
  // })
  // async count(
  //   @param.where(Transaction) where?: Where<Transaction>,
  // ): Promise<Count> {
  //   return this.transactionRepository.count(where);
  // }

  // @get('/transactions')
  // @response(200, {
  //   description: 'Array of Transaction model instances',
  //   content: {
  //     'application/json': {
  //       schema: {
  //         type: 'array',
  //         items: getModelSchemaRef(Transaction, {includeRelations: true}),
  //       },
  //     },
  //   },
  // })
  // async find(
  //   @param.filter(Transaction) filter?: Filter<Transaction>,
  // ): Promise<Transaction[]> {
  //   return this.transactionRepository.find(filter);
  // }

  // @patch('/transactions')
  // @response(200, {
  //   description: 'Transaction PATCH success count',
  //   content: {'application/json': {schema: CountSchema}},
  // })
  // async updateAll(
  //   @requestBody({
  //     content: {
  //       'application/json': {
  //         schema: getModelSchemaRef(Transaction, {partial: true}),
  //       },
  //     },
  //   })
  //   transaction: Transaction,
  //   @param.where(Transaction) where?: Where<Transaction>,
  // ): Promise<Count> {
  //   return this.transactionRepository.updateAll(transaction, where);
  // }

  // @get('/transactions/{id}')
  // @response(200, {
  //   description: 'Transaction model instance',
  //   content: {
  //     'application/json': {
  //       schema: getModelSchemaRef(Transaction, {includeRelations: true}),
  //     },
  //   },
  // })
  // async findById(
  //   @param.path.string('id') id: string,
  //   @param.filter(Transaction, {exclude: 'where'}) filter?: FilterExcludingWhere<Transaction>
  // ): Promise<Transaction> {
  //   return this.transactionRepository.findById(id, filter);
  // }

  // @patch('/transactions/{id}')
  // @response(204, {
  //   description: 'Transaction PATCH success',
  // })
  // async updateById(
  //   @param.path.string('id') id: string,
  //   @requestBody({
  //     content: {
  //       'application/json': {
  //         schema: getModelSchemaRef(Transaction, {partial: true}),
  //       },
  //     },
  //   })
  //   transaction: Transaction,
  // ): Promise<void> {
  //   await this.transactionRepository.updateById(id, transaction);
  // }

  // @put('/transactions/{id}')
  // @response(204, {
  //   description: 'Transaction PUT success',
  // })
  // async replaceById(
  //   @param.path.string('id') id: string,
  //   @requestBody() transaction: Transaction,
  // ): Promise<void> {
  //   await this.transactionRepository.replaceById(id, transaction);
  // }

  // @del('/transactions/{id}')
  // @response(204, {
  //   description: 'Transaction DELETE success',
  // })
  // async deleteById(@param.path.string('id') id: string): Promise<void> {
  //   await this.transactionRepository.deleteById(id);
  // }
}
