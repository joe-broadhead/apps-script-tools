function __astBuildDbtManifestTestFixture() {
  return {
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
        meta: { owner: { team: 'revops' } },
        description: 'Orders model',
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
        meta: { owner: { team: 'revops' } },
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
    sources: {},
    macros: {},
    docs: {},
    exposures: {},
    metrics: {},
    groups: {},
    selectors: {},
    disabled: {},
    parent_map: {
      'model.demo.orders': ['model.demo.customers']
    },
    child_map: {
      'model.demo.customers': ['model.demo.orders']
    },
    group_map: {},
    saved_queries: {},
    semantic_models: {},
    unit_tests: {}
  };
}

DBT_MANIFEST_BASICS_TESTS = [
  {
    description: 'AST.DBT.loadManifest should build index from inline manifest',
    test: () => {
      const manifest = __astBuildDbtManifestTestFixture();
      const out = AST.DBT.loadManifest({
        manifest,
        options: {
          validate: 'strict',
          schemaVersion: 'v12',
          buildIndex: true
        }
      });

      if (out.status !== 'ok') {
        throw new Error('Expected loadManifest status=ok');
      }

      if (!out.bundle || !out.bundle.index) {
        throw new Error('Expected loadManifest to return bundle with index');
      }

      if (out.counts.entityCount < 2) {
        throw new Error(`Expected at least 2 entities, got ${out.counts.entityCount}`);
      }
    }
  },
  {
    description: 'AST.DBT.search should find model and column matches',
    test: () => {
      const manifest = __astBuildDbtManifestTestFixture();
      const searchOut = AST.DBT.search({
        manifest,
        target: 'all',
        query: 'order',
        filters: {
          resourceTypes: ['model']
        },
        include: {
          meta: true,
          columns: 'summary'
        }
      });

      if (searchOut.status !== 'ok') {
        throw new Error('Expected search status=ok');
      }

      if (!Array.isArray(searchOut.items) || searchOut.items.length === 0) {
        throw new Error('Expected search to return at least one item');
      }

      const hasOrders = searchOut.items.some(item => item.uniqueId === 'model.demo.orders');
      if (!hasOrders) {
        throw new Error('Expected search to include model.demo.orders');
      }
    }
  },
  {
    description: 'AST.DBT.getEntity/getColumn/lineage should return deterministic results',
    test: () => {
      const manifest = __astBuildDbtManifestTestFixture();

      const entityOut = AST.DBT.getEntity({
        manifest,
        uniqueId: 'model.demo.orders',
        include: {
          columns: 'summary',
          meta: true
        }
      });

      if (!entityOut.item || entityOut.item.uniqueId !== 'model.demo.orders') {
        throw new Error('Expected getEntity to return model.demo.orders');
      }

      const columnOut = AST.DBT.getColumn({
        manifest,
        uniqueId: 'model.demo.orders',
        columnName: 'order_id'
      });

      if (!columnOut.item || columnOut.item.name !== 'order_id') {
        throw new Error('Expected getColumn to return order_id');
      }

      const lineageOut = AST.DBT.lineage({
        manifest,
        uniqueId: 'model.demo.orders',
        direction: 'upstream',
        depth: 2
      });

      if (!Array.isArray(lineageOut.nodes) || lineageOut.nodes.length === 0) {
        throw new Error('Expected lineage to return nodes');
      }

      const upstreamFound = lineageOut.nodes.some(node => node.uniqueId === 'model.demo.customers');
      if (!upstreamFound) {
        throw new Error('Expected lineage to include model.demo.customers');
      }
    }
  }
];
