/**
*   ____                         ____        
*  / ___|_ __ ___  _   _ _ __   | __ ) _   _ 
* | |  _| '__/ _ \| | | | '_ \  |  _ \| | | |
* | |_| | | | (_) | |_| | |_) | | |_) | |_| |
*  \____|_|  \___/ \__,_| .__/  |____/ \__, |
*                       |_|            |___/ 
*/

var GroupBy = class GroupBy {
    constructor(df, keys) {
      this.df = df;
      this.keys = keys;
      this.groups = this._buildGroups();
    }

    _buildGroups() {
      const groups = {};
      const groupedIndexes = new Map();
      const keyColumns = this.keys.map(key => {
        if (!this.df.columns.includes(key)) {
          throw new Error(`Column '${key}' not found in DataFrame`);
        }
        return this.df.data[key].array;
      });

      for (let rowIdx = 0; rowIdx < this.df.len(); rowIdx++) {
        const keyValues = new Array(keyColumns.length);
        for (let keyIdx = 0; keyIdx < keyColumns.length; keyIdx++) {
          keyValues[keyIdx] = keyColumns[keyIdx][rowIdx];
        }

        const groupKey = astBuildValuesKey(keyValues);

        if (!groupedIndexes.has(groupKey)) {
          groupedIndexes.set(groupKey, []);
        }

        groupedIndexes.get(groupKey).push(rowIdx);
      }

      for (const [groupKey, rowIndexes] of groupedIndexes.entries()) {
        groups[groupKey] = this.df._buildFromRowIndexes(rowIndexes, true);
      }

      return groups;
    }
  
    agg(aggregations) {
      const results = [];
  
      for (const group of Object.values(this.groups)) {
        const groupKeys = group.dropDuplicates(this.keys).select(this.keys);
        const output = {};
  
        for (const [colName, aggFuncs] of Object.entries(aggregations)) {
          const funcsArray = Array.isArray(aggFuncs) ? aggFuncs : [aggFuncs];
  
          funcsArray.forEach(aggFunc => {
            const isCustomFunc = typeof aggFunc === 'function';
            const suffix = isCustomFunc ? aggFunc.name : aggFunc;
            const newColName = `${colName}_${suffix}`;
            const columnData = group[colName].array;
  
            output[newColName] = isCustomFunc
              ? aggFunc(columnData)
              : group[colName][aggFunc]();
          });
        }
  
        results.push(groupKeys.assign(output));
      }
  
      return DataFrame.concat(results);
    }

    apply(func) {
      const results = [];
      
      for (const group of Object.values(this.groups)) {
        const transformedGroup = func(group);
        
        if (!(transformedGroup instanceof DataFrame)) {
          throw new Error('The applied function must return a DataFrame');
        }
        
        results.push(transformedGroup);
      }
      return DataFrame.concat(results);
    }

    *[Symbol.iterator]() {
      for (const [key, group] of Object.entries(this.groups)) {
        yield [key, group];
      }
    }
  };

const __astGroupByRoot = typeof globalThis !== 'undefined' ? globalThis : this;
__astGroupByRoot.GroupBy = GroupBy;
this.GroupBy = GroupBy;
