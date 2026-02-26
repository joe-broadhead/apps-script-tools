export function createManifestFixture(overrides = {}) {
  const base = {
    metadata: {
      dbt_schema_version: 'https://schemas.getdbt.com/dbt/manifest/v12.json',
      dbt_version: '1.10.8',
      generated_at: '2026-02-25T00:00:00.000Z',
      project_name: 'demo_project',
      project_id: 'demo_project_id'
    },
    nodes: {
      'model.demo.orders': {
        unique_id: 'model.demo.orders',
        name: 'orders',
        resource_type: 'model',
        package_name: 'demo',
        path: 'models/marts/orders.sql',
        original_file_path: 'models/marts/orders.sql',
        tags: ['finance', 'marts'],
        meta: {
          owner: { team: 'revops' },
          sensitivity: 'low'
        },
        description: 'Orders mart model',
        depends_on: {
          nodes: ['model.demo.customers']
        },
        columns: {
          order_id: {
            name: 'order_id',
            description: 'Order id',
            data_type: 'string',
            meta: { pii: false },
            tags: ['id']
          },
          amount: {
            name: 'amount',
            description: 'Order amount',
            data_type: 'numeric',
            meta: { pii: false },
            tags: ['measure']
          }
        }
      },
      'model.demo.customers': {
        unique_id: 'model.demo.customers',
        name: 'customers',
        resource_type: 'model',
        package_name: 'demo',
        path: 'models/marts/customers.sql',
        original_file_path: 'models/marts/customers.sql',
        tags: ['marts'],
        meta: {
          owner: { team: 'revops' },
          sensitivity: 'high'
        },
        description: 'Customers model',
        depends_on: {
          nodes: []
        },
        columns: {
          customer_id: {
            name: 'customer_id',
            description: 'Customer id',
            data_type: 'string',
            meta: { pii: true },
            tags: ['id']
          }
        }
      }
    },
    sources: {
      'source.demo.raw_orders': {
        unique_id: 'source.demo.raw_orders',
        name: 'raw_orders',
        source_name: 'raw',
        identifier: 'raw_orders',
        resource_type: 'source',
        package_name: 'demo',
        path: 'models/src/raw.yml',
        original_file_path: 'models/src/raw.yml',
        tags: ['raw'],
        meta: { owner: { team: 'data-eng' } },
        description: 'Raw orders source',
        columns: {}
      }
    },
    macros: {},
    docs: {},
    exposures: {},
    metrics: {},
    groups: {},
    selectors: {},
    disabled: {
      'model.demo.old_orders': [
        {
          unique_id: 'model.demo.old_orders',
          name: 'old_orders',
          resource_type: 'model',
          package_name: 'demo',
          path: 'models/legacy/old_orders.sql',
          original_file_path: 'models/legacy/old_orders.sql',
          tags: ['legacy'],
          meta: { owner: { team: 'revops' } },
          description: 'Legacy disabled model',
          depends_on: { nodes: [] },
          columns: {}
        }
      ]
    },
    parent_map: {
      'model.demo.orders': ['model.demo.customers'],
      'model.demo.customers': []
    },
    child_map: {
      'model.demo.customers': ['model.demo.orders'],
      'model.demo.orders': []
    },
    group_map: {},
    saved_queries: {},
    semantic_models: {},
    unit_tests: {}
  };

  return {
    ...base,
    ...overrides
  };
}

export function createManifestFixtureVariant() {
  const base = createManifestFixture();
  const next = JSON.parse(JSON.stringify(base));

  delete next.nodes['model.demo.customers'];
  next.nodes['model.demo.payments'] = {
    unique_id: 'model.demo.payments',
    name: 'payments',
    resource_type: 'model',
    package_name: 'demo',
    path: 'models/marts/payments.sql',
    original_file_path: 'models/marts/payments.sql',
    tags: ['finance'],
    meta: {
      owner: { team: 'revops' },
      sensitivity: 'medium'
    },
    description: 'Payments model',
    depends_on: {
      nodes: ['model.demo.orders']
    },
    columns: {
      payment_id: {
        name: 'payment_id',
        description: 'Payment identifier',
        data_type: 'string',
        meta: { pii: false },
        tags: ['id']
      }
    }
  };

  next.nodes['model.demo.orders'].description = 'Orders mart model (v2)';
  next.nodes['model.demo.orders'].columns.amount.description = 'Order amount in local currency';

  next.parent_map = {
    'model.demo.orders': [],
    'model.demo.payments': ['model.demo.orders']
  };
  next.child_map = {
    'model.demo.orders': ['model.demo.payments'],
    'model.demo.payments': []
  };

  return next;
}

export function createCatalogFixture() {
  return {
    metadata: {
      dbt_schema_version: 'https://schemas.getdbt.com/dbt/catalog/v1.json',
      dbt_version: '1.10.8',
      generated_at: '2026-02-25T00:00:00.000Z'
    },
    nodes: {
      'model.demo.orders': {
        unique_id: 'model.demo.orders',
        resource_type: 'model',
        package_name: 'demo',
        name: 'orders',
        original_file_path: 'models/marts/orders.sql',
        database: 'analytics',
        schema: 'marts',
        alias: 'orders',
        relation_name: 'analytics.marts.orders',
        columns: {
          order_id: {
            name: 'order_id',
            type: 'STRING'
          },
          amount: {
            name: 'amount',
            type: 'NUMERIC'
          }
        }
      }
    },
    sources: {
      'source.demo.raw_orders': {
        unique_id: 'source.demo.raw_orders',
        resource_type: 'source',
        package_name: 'demo',
        name: 'raw_orders',
        original_file_path: 'models/src/raw.yml',
        database: 'raw',
        schema: 'ingest',
        identifier: 'raw_orders',
        relation_name: 'raw.ingest.raw_orders',
        columns: {
          order_id: {
            name: 'order_id',
            type: 'STRING'
          }
        }
      }
    }
  };
}

export function createRunResultsFixture() {
  return {
    metadata: {
      dbt_schema_version: 'https://schemas.getdbt.com/dbt/run-results/v5.json',
      dbt_version: '1.10.8',
      generated_at: '2026-02-25T00:00:00.000Z'
    },
    elapsed_time: 12.5,
    results: [
      {
        unique_id: 'model.demo.orders',
        status: 'success',
        execution_time: 4.2,
        thread_id: 'Thread-1',
        message: '',
        failures: 0
      },
      {
        unique_id: 'model.demo.customers',
        status: 'error',
        execution_time: 3.3,
        thread_id: 'Thread-1',
        message: 'relation not found',
        failures: 1
      }
    ]
  };
}

export function createSourcesArtifactFixture() {
  return {
    metadata: {
      dbt_schema_version: 'https://schemas.getdbt.com/dbt/sources/v3.json',
      dbt_version: '1.10.8',
      generated_at: '2026-02-25T00:00:00.000Z'
    },
    results: [
      {
        unique_id: 'source.demo.raw_orders',
        status: 'pass',
        max_loaded_at: '2026-02-25T00:00:00.000Z',
        snapshotted_at: '2026-02-25T00:05:00.000Z',
        execution_time: 1.2,
        thread_id: 'Thread-2',
        message: ''
      }
    ]
  };
}
