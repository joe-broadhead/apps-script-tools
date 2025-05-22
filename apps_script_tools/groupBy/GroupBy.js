/**
*   ____                         ____        
*  / ___|_ __ ___  _   _ _ __   | __ ) _   _ 
* | |  _| '__/ _ \| | | | '_ \  |  _ \| | | |
* | |_| | | | (_) | |_| | |_) | | |_) | |_| |
*  \____|_|  \___/ \__,_| .__/  |____/ \__, |
*                       |_|            |___/ 
*/

class GroupBy {
    constructor(df, keys) {
      this.df = df;
      this.keys = keys;
      this.groups = groupRecordsOnKeys(
        df.toRecords(),
        keys,
        group => DataFrame.fromRecords(group)
      );
    }
  
    agg(aggregations) {
      const results = [];
  
      for (const group of Object.values(this.groups)) {
        const groupKeys = group.select(this.keys).dropDuplicates();
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
  }