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
