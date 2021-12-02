<?php

abstract class Record {
	static function select($conditions = [], $order = NULL, $limit = NULL) {
		$db = new DB();

		list($query, $aliases) = self::query_from_conditions($conditions, $order, $limit);

		if (!($result = $db->query($query))) {
			return [];
		}

		$found = [];

		$fields = [];
		for ($i = 0; $i < $result->columnCount(); $i++) {
			$fields[$i] = $result->getColumnMeta($i);
		}

		$class = get_called_class();
		while ($record = $result->fetch(PDO::FETCH_NUM)) {
			$object = new $class;

			$object->load_from_result(static::$table, $aliases, $record, $fields);

			$found[$object->id] = $object;
		}

		return $found;
	}

	function load($conditions = []) {
		$db = new DB();

		list($query, $aliases) = self::query_from_conditions($conditions);

		$result = $db->query($query);

		if (!$result or !$record = $result->fetch(PDO::FETCH_NUM)) {
			return false;
		}

		$fields = [];
		for ($i = 0; $i < $result->columnCount(); $i++) {
			$fields[$i] = $result->getColumnMeta($i);
		}

		$this->load_from_result(static::$table, $aliases, $record, $fields);

		return $this->id;
	}

	private function load_from_result($main_table, $aliases, $db_record, $db_fields) {
		foreach ($db_record as $field_number => $value) {
			$field = $db_fields[$field_number];

			if ($field['table'] == $main_table) {
				$this->{$field['name']} = $value;
			} else if ($value !== NULL && isset($aliases[$field['table']])) {
				$alias = $aliases[$field['table']];
				$property = str_replace('_id', '', $alias['field']);
				
				if (!isset($this->{$property})) {
					$this->{$property} = new $alias['class'];
				}

				$this->{$property}->{$field['name']} = $value;
			}
		}
	}

	private static function query_from_conditions($conditions, $order = NULL, $limit = NULL) {
		$db = new DB();

		$aliases = [];

		$query_select = [
			'`' . static::$table . '`.*',
		];
		$query_join = [];
		$query_where = [];

		if (isset(static::$relations)) foreach (static::$relations as $field => $class) {
			$table = $class::$table;
			$table_alias = $table;

			if (isset($aliases[$table])) {
				$table_alias = $table."_";
			}

			$aliases[$table_alias] = [
				'class' => $class,
				'table' => $table,
				'table_alias' => $table_alias,
				'field' => $field,
			];

			$query_select[] = "`{$table_alias}`.*";

			$query_join[] = "LEFT JOIN `{$table}` `{$table_alias}` ON `".static::$table."`.`{$field}` = `{$table_alias}`.id";
		}

		foreach ($conditions as $field => $value) {
			if (is_string($field)) {
				$condition = '=';

				if (is_array($value)) {
					$condition = 'IN';
					$values = [];
					foreach ($value as $v) {
						$values[] = $db->escape($v);
					}
					$value = '('.implode(', ', $values).')';
				} else {
					$value = $db->escape($value);
				}

				if (strpos($field, ' ') !== FALSE) {
					list($field, $condition) = explode(' ', $field, 2);
				}

				if (preg_match("/^[a-z_]\+/", $field)) {
					$field = "`".static::$table."`.`{$field}`";
				}

				$query_where[] = "{$field} {$condition} {$value}";
			} else {
				if (preg_match("/^[a-z_]\+ /", $value)) {
					$query_where[] = '`'.static::$table.'`.'.$value;
				} else {
					$query_where[] = $value;
				}
			}
		}

		$query =
			" SELECT ".implode(", ", $query_select)."\n".
			" FROM `".static::$table."`\n".
			implode("\n", $query_join)."\n";

		if (count($query_where)) {
			$query .= " WHERE ".implode(" AND ", $query_where);
		}

		if ($order) {
			$query .= " ORDER BY ".$order." ";

			if ($limit) {
				$query .= " LIMIT ".$limit." ";
			}
		}

		return [$query, $aliases];
	}
}

