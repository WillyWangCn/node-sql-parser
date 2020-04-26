
import { exprToSQL } from './expr'
import { indexDefinitionToSQL } from './index-definition'
import { columnDefinitionToSQL } from './column'
import { constraintDefinitionToSQL } from './constrain'
import { funcToSQL } from './func'
import { tablesToSQL, tableOptionToSQL, tableToSQL } from './tables'
import { unionToSQL } from './union'
import { toUpper, hasVal, identifierToSql, columnRefToSQL } from './util'

function createDefinitionToSQL(definition) {
  if (!definition) return []
  const { resource } = definition
  switch (resource) {
    case 'column':
      return columnDefinitionToSQL(definition)
    case 'index':
      return indexDefinitionToSQL(definition)
    case 'constraint':
      return constraintDefinitionToSQL(definition)
    default:
      throw new Error(`unknow resource = ${resource} type`)
  }
}

function createTableToSQL(stmt) {
  const {
    type, keyword, table, like, as, temporary,
    if_not_exists: ifNotExists,
    create_definitions: createDefinition,
    table_options: tableOptions,
    ignore_replace: ignoreReplace,
    query_expr: queryExpr,
  } = stmt
  const sql = [toUpper(type), toUpper(temporary), toUpper(keyword), toUpper(ifNotExists), tablesToSQL(table)]
  if (like) {
    const { type: likeType, table: likeTable } = like
    const likeTableName = tablesToSQL(likeTable)
    sql.push(toUpper(likeType), likeTableName)
    return sql.filter(hasVal).join(' ')
  }
  if (createDefinition) {
    sql.push(`(${createDefinition.map(createDefinitionToSQL).join(', ')})`)
  }
  if (tableOptions) {
    sql.push(tableOptions.map(tableOptionToSQL).join(' '))
  }
  sql.push(toUpper(ignoreReplace), toUpper(as))
  if (queryExpr) sql.push(unionToSQL(queryExpr))
  return sql.filter(hasVal).join(' ')
}

function createTriggerToSQL(stmt) {
  const {
    constraint,
    constraint_kw: constraintKw,
    deferrable,
    events,
    execute,
    for_each: forEach,
    from,
    keyword,
    type,
    location,
    table,
    when,
  } = stmt
  const sql = [toUpper(type), toUpper(constraintKw), toUpper(keyword), identifierToSql(constraint), toUpper(location)]
  const eventList = events.map(event => {
    const { keyword: kw, args } = event
    const result = [toUpper(kw)]
    if (args) {
      const { keyword: kwArgs, columns } = args
      result.push(toUpper(kwArgs), columns.map(columnRefToSQL).join(', '))
    }
    return result.join(' ')
  }).join(' OR ')
  sql.push(eventList, 'ON', tableToSQL(table))
  if (from) sql.push('FROM', tableToSQL(from))
  if (deferrable) sql.push(toUpper(deferrable.keyword), toUpper(deferrable.args))
  if (forEach) sql.push(toUpper(forEach.keyword), toUpper(forEach.args))
  if (when) sql.push(toUpper(when.type), exprToSQL(when.cond))
  sql.push(toUpper(execute.keyword), funcToSQL(execute.expr))
  return sql.filter(hasVal).join(' ')
}

function createToSQL(stmt) {
  const { keyword } = stmt
  switch (keyword.toLowerCase()) {
    case 'table':
      return createTableToSQL(stmt)
    case 'trigger':
      return createTriggerToSQL(stmt)
    default:
      throw new Error(`unknow create resource ${keyword}`)
  }
}

export {
  createToSQL,
}
