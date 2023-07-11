/**
 * @file Objective-C grammar for tree-sitter
 * @author Amaan Qureshi <amaanq12@gmail.com>
 * @license MIT
 */

/* eslint-disable arrow-parens */
/* eslint-disable camelcase */
/* eslint-disable-next-line spaced-comment */
/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const C = require('tree-sitter-c/grammar');

// Welcome to Hell
module.exports = grammar(C, {
  name: 'objc',

  extras: $ => [
    /\u00A0|\s|\\\r?\n/,
    $.comment,
  ],

  conflicts: ($, superclass) => superclass.concat([
    [$.enum_specifier],
    [$._expression, $.macro_type_specifier],
    [$._expression, $.generic_specifier],
    [$._declarator, $._type_specifier, $.generic_specifier],
    [$.attribute, $._expression],
    [$.parameterized_arguments],
    [$.string_literal],
  ]),

  inline: ($, original) => original.concat([
    $.method_selector,
    $.method_selector_no_list,
    $.keyword_selector,
    $.interface_declaration,
    $.typedefed_identifier,
  ]),

  supertypes: ($, original) => original.concat([
    $.specifier_qualifier,
  ]),

  rules: {
    _top_level_item: ($, original) => choice(
      // ...original.members.filter(member => member.name !== 'attributed_statement'),
      original,
      $.class_declaration,
      $.class_interface,
      $.class_implementation,
      $.protocol_declaration,
      $.protocol_forward_declaration,
      $.module_import,
      $.compatibility_alias_declaration,
      $.preproc_undef,
      $.preproc_linemarker,
    ),

    function_definition: $ => seq(
      optional($.ms_call_modifier),
      $._declaration_specifiers,
      field('declarator', $._declarator),
      field('body', $.compound_statement),
    ),

    declaration: $ => seq(
      $._declaration_specifiers,
      commaSep1(prec.right(field('declarator', choice(
        $._declarator,
        $.init_declarator,
        seq($.type_qualifier, $.identifier),
      )))),
      optional($._declaration_modifiers),
      ';',
    ),

    type_definition: $ => seq(
      optional($.ms_declspec_modifier),
      'typedef',
      optional($.attribute_specifier),
      optional($.ms_declspec_modifier),
      repeat($.type_qualifier),
      optional($.attribute_specifier),
      field('type', $._type_specifier),
      optional($.ms_declspec_modifier),
      optional($.type_qualifier),
      commaSep1(field('declarator', $._type_declarator)),
      optional($._declaration_modifiers),
      ';',
    ),

    _declaration_modifiers: ($, original) => choice(
      // ...original.members.filter(member => member.name !== 'attribute_declaration'),
      original,
      $.availability_attribute_specifier,
      $.attribute_declaration,
      $.alignas_specifier,
    ),

    _declaration_specifiers: $ => prec.right(seq(
      repeat($._declaration_modifiers),
      field('type', $._type_specifier),
      repeat($._declaration_modifiers),
    )),

    parameter_declaration: $ => seq(
      $._declaration_specifiers,
      optional(field('declarator', choice(
        seq($._declarator, optional($._declaration_modifiers)),
        $._abstract_declarator,
      ))),
    ),

    _non_case_statement: ($, original) => choice(
      // ...original.members.filter(member => member.name !== 'attributed_statement'),
      original,
      $.try_statement,
      $.throw_statement,
      $.synchronized_statement,
      $.ms_asm_block,
      $.asm_statement,
    ),

    attribute: $ => seq(
      optional(seq(field('prefix', $.identifier), '::')),
      field('name', $.identifier),
      optional(seq('(', commaSep($._expression), ')')),
    ),

    attribute_declaration: $ => seq(
      '[',
      '[',
      commaSep1($.attribute),
      ']',
      ']',
    ),

    _expression: ($, original) => choice(
      original,
      $.message_expression,
      $.selector_expression,
      $.available_expression,
      $.range_expression,
      $.block_literal,
      $.dictionary_literal,
      $.array_literal,
      $.at_expression,
      $.encode_expression,
      $.va_arg_expression,
      $.keyword_identifier,
    ),

    cast_expression: $ => prec(C.PREC.CAST, choice(
      seq(
        '(',
        optional($.type_qualifier),
        field('type', choice($.type_descriptor, $.typeof_specifier, $.parameterized_arguments)),
        ')',
        field('value', $._expression),
      ),
      seq(choice('__real', '__imag'), field('value', $._expression)),
    )),

    argument_list: $ => seq(
      '(',
      choice(
        commaSep(seq(optional($.type_qualifier), choice($._expression, $.typeof_specifier))),
        // man _Generic
        seq($._expression, ',', commaSep1(seq($._type_specifier, ':', $._expression))),
        seq($._type_identifier, token.immediate('<'), commaSep1($.type_name), '>'),
        $.objc_bridge,
        $.availability,
      ),
      ')',
    ),

    objc_bridge: $ => seq(
      'objc_bridge_related',
      '(',
      $._expression,
      ',',
      optional(seq($._expression, ':')),
      ',',
      optional($._expression),
      ')',
    ),

    typeof_specifier: $ => seq(
      choice('__typeof__', '__typeof', 'typeof'),
      '(',
      choice($._expression, $.type_descriptor),
      ')',
    ),

    compound_statement: $ => seq(
      optional('@autoreleasepool'),
      '{',
      repeat($._top_level_item),
      '}',
    ),

    availability: $ => seq(
      'availability',
      '(',
      commaSep1(seq(
        $.identifier,
        optional(seq(
          '=',
          choice($.version, $._expression),
        )),
      )),
      ')',
    ),
    version: $ => prec.right(choice(
      $.platform,
      $.version_number,
      seq(
        $.platform,
        '(',
        commaSep1(choice($.number_literal, $.identifier)),
        ')',
      ),
    )),
    version_number: _ => /\d+([\._]\d+)*/,
    platform: _ => choice('ios', 'tvos', 'macos', 'macosx', 'watchos'),

    _declarator: ($, original) => prec.right(choice(
      ...original.members.filter(member => member.name !== 'attributed_declarator'),
      $.block_pointer_declarator,
    )),

    _abstract_declarator: ($, original) => choice(
      original,
      $.abstract_block_pointer_declarator,
    ),

    _field_declarator: ($, original) => choice(
      original,
      alias($.block_pointer_field_declarator, $.block_pointer_declarator),
    ),

    _type_declarator: $ => choice(
      alias($.pointer_type_declarator, $.pointer_declarator),
      alias($.function_type_declarator, $.function_declarator),
      alias($.array_type_declarator, $.array_declarator),
      alias($.parenthesized_type_declarator, $.parenthesized_declarator),
      alias($.block_pointer_type_declarator, $.block_pointer_declarator),
      $._type_identifier,
    ),

    for_statement: ($, original) => choice(
      original,
      prec(1, seq(
        'for',
        '(',
        choice(
          seq($._declaration_specifiers, $._declarator),
          $.identifier,
        ),
        'in',
        $._expression,
        ')',
        $._non_case_statement,
      )),
    ),

    type_qualifier: (_, original) => prec.right(choice(
      original,
      'nullable',
      '_Complex',
      '_Nonnull',
      '_Nullable',
      '_Nullable_result',
      '_Null_unspecified',
      '__autoreleasing',
      '__block',
      '__bridge',
      '__bridge_retained',
      '__bridge_transfer',
      '__complex',
      '__const',
      '__imag',
      '__kindof',
      '__nonnull',
      '__nullable',
      '__ptrauth_objc_class_ro',
      '__ptrauth_objc_isa_pointer',
      '__ptrauth_objc_super_pointer',
      '__real',
      '__strong',
      '__thread',
      '__unsafe_unretained',
      '__unused',
      '__weak',
    )),

    storage_class_specifier: (_, original) => choice(
      original,
      '__inline__',
      'CG_EXTERN',
      'CG_INLINE',
      'FOUNDATION_EXPORT',
      'FOUNDATION_EXTERN',
      'FOUNDATION_STATIC_INLINE',
      'IBOutlet',
      'IBInspectable',
      'IB_DESIGNABLE',
      'NS_INLINE',
      'NS_VALID_UNTIL_END_OF_SCOPE',
      'OBJC_EXPORT',
      'OBJC_ROOT_CLASS',
      'UIKIT_EXTERN',
    ),

    preproc_include: $ => seq(
      field('directive', choice(preprocessor('include'), preprocessor('import'))),
      field('path', choice(
        $.string_literal,
        $.system_lib_string,
        $.identifier,
        alias($.preproc_call_expression, $.call_expression),
      )),
      '\n',
    ),

    module_import: $ => seq(
      '@import',
      field('path', seq($.identifier, repeat(seq('.', $.identifier)))),
      ';',
    ),

    ...preprocIf('', $ => choice($._top_level_item, $.attribute_specifier, $.property_implementation)),
    ...preprocIf('_in_implementation_definition', $ => $.implementation_definition),
    ...preprocIf('_in_interface_declaration', $ => $.interface_declaration),
    ...preprocIf('_in_enumerator', $ => seq($.enumerator, ',')),

    preproc_undef: $ => seq(
      preprocessor('undef'),
      field('name', $.identifier),
      '\n',
    ),

    preproc_linemarker: $ => seq(
      '#',
      $.number_literal,
      field('filename', $.string_literal),
      optional(seq(
        field('row', $.number_literal),
        optional(field('column', $.number_literal)),
      )),
      '\n',
    ),

    _preproc_expression: ($, original) => choice(
      original,
      $.system_lib_string,
    ),

    preproc_params: $ => seq(
      token.immediate('('), commaSep(choice($.identifier, '...')), optional('...'), ')',
    ),

    attribute_specifier: $ => seq(
      choice('__attribute__', '__attribute'),
      '(',
      $.argument_list,
      ')',
    ),

    asm_statement: $ => (seq(
      choice('asm', '__asm__'),
      optional('volatile'),
      '(',
      $.string_literal,
      optional(seq(
        ':',
        commaSep($.asm_operand),
        optional(seq(
          ':',
          commaSep($.asm_operand),
          optional(seq(
            ':',
            commaSep($.asm_operand),
          )),
        )),
      )),
      ')',
      ';',
    )),

    asm_operand: $ => (seq(
      $.string_literal,
      optional(seq('(', $.identifier, ')')),
    )),

    availability_attribute_specifier: $ => choice(
      'NS_AUTOMATED_REFCOUNT_UNAVAILABLE',
      'NS_ROOT_CLASS',
      'NS_UNAVAILABLE',
      'NS_REQUIRES_NIL_TERMINATION',
      'CF_RETURNS_RETAINED',
      'CF_RETURNS_NOT_RETAINED',
      'DEPRECATED_ATTRIBUTE',
      'UI_APPEARANCE_SELECTOR',
      'UNAVAILABLE_ATTRIBUTE',
      seq(
        choice(
          'CF_FORMAT_FUNCTION',
          'NS_AVAILABLE',
          '__IOS_AVAILABLE',
          'NS_AVAILABLE_IOS',
          'API_AVAILABLE',
          'API_UNAVAILABLE',
          'API_DEPRECATED',
          'NS_ENUM_AVAILABLE_IOS',
          'NS_DEPRECATED_IOS',
          'NS_ENUM_DEPRECATED_IOS',
          'NS_FORMAT_FUNCTION',
          'DEPRECATED_MSG_ATTRIBUTE',
          '__deprecated_msg',
          '__deprecated_enum_msg',
          'NS_SWIFT_NAME',
          'NS_SWIFT_UNAVAILABLE',
          'NS_EXTENSION_UNAVAILABLE_IOS',
          'NS_CLASS_AVAILABLE_IOS',
          'NS_CLASS_DEPRECATED_IOS',
          '__OSX_AVAILABLE_STARTING',
        ),
        '(',
        commaSep1(choice(
          $.string_literal,
          $.concatenated_string,
          $.version,
          $.method_identifier,
          $.identifier,
          seq($.identifier, '(', optional($.method_identifier), ')'),
        )),
        ')',
      ),
    ),

    struct_specifier: $ => prec.right(seq(
      'struct',
      optional($.attribute_specifier),
      optional($.ms_declspec_modifier),
      choice(
        seq(
          field('name', $._type_identifier),
          field('body', optional($.field_declaration_list)),
        ),
        field('body', $.field_declaration_list),
      ),
      optional($.attribute_specifier),
    )),

    enum_specifier: $ => seq(
      'enum',
      optional($.attribute_specifier),
      optional($.ms_declspec_modifier),
      choice(
        seq(
          field('name', $._type_identifier),
          optional(seq(':', field('base', $._type_identifier))),
          field('body', optional($.enumerator_list)),
        ),
        seq(
          optional(seq(':', field('base', $._type_identifier))),
          field('body', $.enumerator_list),
        ),
      ),
      optional($.attribute_specifier),
    ),

    enumerator_list: $ => seq(
      '{',
      optionalCommaSep(choice(
        seq($.enumerator, optional($._declaration_modifiers)),
        alias($.preproc_ifdef_in_enumerator, $.preproc_ifdef),
      )),
      optional(','),
      '}',
    ),

    enumerator: $ => seq(
      field('name', $.identifier),
      optional(seq('=', field('value', $._expression))),
    ),

    union_specifier: $ => prec.right(seq(
      'union',
      optional($.attribute_specifier),
      optional($.ms_declspec_modifier),
      choice(
        seq(
          field('name', $._type_identifier),
          field('body', optional($.field_declaration_list)),
        ),
        field('body', $.field_declaration_list),
      ),
      optional($.attribute_specifier),
    )),

    protocol_forward_declaration: $ => seq(
      repeat($._declaration_modifiers),
      '@protocol',
      commaSep1($.identifier),
      ';',
    ),

    class_declaration: $ => seq(
      '@',
      'class',
      commaSep1(seq($.identifier, optional($.parameterized_arguments))),
      ';',
    ),

    class_interface: $ => seq(
      repeat($._declaration_modifiers),
      '@interface',
      $.identifier,
      optional(';'),
      optional($.generic_arguments),
      optional($.parameterized_arguments),
      optional(choice(
        seq(':', field('superclass', $.identifier), optional($.parameterized_arguments)),
        seq('(', field('category', optional($.identifier)), ')'),
      )),
      optional($.parameterized_arguments),
      optional($.instance_variables),
      repeat($.interface_declaration),
      '@end',
    ),

    class_implementation: $ => seq(
      repeat($._declaration_modifiers),
      '@implementation',
      $.identifier,
      optional(';'),
      optional(choice(
        seq(':', field('superclass', $.identifier)),
        seq('(', field('category', $.identifier), ')'),
      )),
      optional($.instance_variables),
      repeat($.implementation_definition),
      '@end',
    ),

    protocol_reference_list: $ => seq('<', commaSep1($.identifier), '>'),

    parameterized_arguments: $ => prec(-1, seq(
      '<',
      choice(
        commaSep1(seq(
          commaSep1(seq(optional(choice('__covariant', '__contravariant')), $._type_identifier)),
          optional(seq(':', $.type_name)),
        )),
        // commaSep1($._type_identifier),
        commaSep1($.type_name),
      ),
      '>',
    )),

    generic_arguments: $ => prec.right(seq('(', commaSep1($._type_identifier), ')')),

    instance_variables: $ => seq(
      '{',
      repeat(seq(
        optional(choice($.attribute_specifier, $.attribute_declaration)),
        $.instance_variable,
      )),
      '}',
      optional(';'),
    ),

    instance_variable: $ => choice(
      $.visibility_specification,
      $.struct_declaration,
      $.atomic_declaration,
      $.preproc_ifdef,
      $.preproc_if,
    ),

    visibility_specification: _ => choice(
      '@private',
      '@protected',
      '@package',
      '@public',
    ),

    protocol_declaration: $ => seq(
      repeat($._declaration_modifiers),
      '@protocol',
      $.identifier,
      optional($.protocol_reference_list),
      repeat($.interface_declaration),
      repeat($.qualified_protocol_interface_declaration),
      '@end',
    ),

    compatibility_alias_declaration: $ => seq(
      '@compatibility_alias',
      field('class', $.identifier),
      field('alias', $.identifier),
    ),

    interface_declaration: $ => choice(
      $.declaration,
      $.property_declaration,
      $.method_declaration,
      $.function_definition,
      $.type_definition,
      alias($.preproc_if_in_interface_declaration, $.preproc_if),
      $.preproc_def,
      $.preproc_ifdef,
      $.preproc_undef,
      $.preproc_call,
      seq($.struct_specifier, ';'),
    ),

    qualified_protocol_interface_declaration: $ => choice(
      seq('@optional', repeat($.interface_declaration)),
      seq('@required', repeat($.interface_declaration)),
    ),

    implementation_definition: $ => prec(1, choice(
      $.function_definition,
      $.declaration,
      $.property_implementation,
      seq($.struct_specifier, ';'),
      $.method_definition,
      $.preproc_function_def,
      $.macro_type_specifier,
      $.type_definition,
      alias($.preproc_if_in_implementation_definition, $.preproc_if),
      $.preproc_ifdef,
      $.preproc_undef,
      $.preproc_def,
      $.preproc_call,
    )),

    property_implementation: $ => choice(
      seq(
        '@synthesize',
        commaSep1(seq($.identifier, optional(seq('=', $.identifier)))),
        ';',
      ),
      seq('@dynamic', optional('(class)'), commaSep1($.identifier), ';'),
    ),

    method_definition: $ => seq(
      choice('+', '-'), // class = '+', instance = '-'
      optional($.method_type),
      optional($.attribute_specifier),
      choice(
        seq(
          $.method_selector_no_list,
          optional(seq(
            $.method_parameter,
            repeat(seq(optional($.method_selector), $.method_parameter)),
          )),
        ),
        seq(
          $.method_parameter,
          repeat(seq(optional($.method_selector), $.method_parameter)),
        ),
      ),
      optional(seq(',', choice('...', commaSep1(alias($.c_method_parameter, $.method_parameter))))),
      repeat($.declaration),
      repeat($._declaration_modifiers),
      optional(';'),
      $.compound_statement,
      optional(';'),
    ),

    method_type: $ => seq(
      '(',
      commaSep1(seq(optional($.attribute_specifier), choice($.type_name, $.parameterized_arguments))),
      ')',
    ),

    method_selector: $ => prec.left(choice(
      $.method_selector_no_list,
      seq($.keyword_selector, ','),
    )),

    method_selector_no_list: $ => choice(
      $.identifier,
      $.keyword_selector,
      seq($.keyword_selector, ',', '...'),
    ),

    keyword_selector: $ => repeat1($.keyword_declarator),

    keyword_declarator: $ => seq(
      optional($.identifier),
      ';',
      optional($.method_type),
      $.identifier,
    ),

    property_declaration: $ => (seq(
      optional($._declaration_modifiers),
      '@property',
      optional($.property_attributes_declaration),
      optional(choice($.attribute_specifier, $.attribute_declaration)),
      choice($.struct_declaration, $.atomic_declaration),
    )),

    property_attributes_declaration: $ => seq(
      '(',
      commaSep($.property_attribute),
      ')',
    ),

    property_attribute: $ => choice(
      $.identifier,
      seq($.identifier, '=', $.identifier, optional(':')),
    ),

    method_declaration: $ => seq(
      choice('+', '-'), // class = '+', instance = '-'
      optional($.method_type),
      optional(choice($.attribute_specifier, $.attribute_declaration)),
      repeat1(choice(
        seq(
          $.method_selector,
          optional($.attribute_specifier),
          optional($.method_parameter),
        ),
        $.method_parameter,
      )),
      optional(seq(',', choice('...', commaSep1(alias($.c_method_parameter, $.method_parameter))))),
      repeat($._declaration_modifiers),
      repeat1(prec.right(';')),
    ),

    method_parameter: $ => prec.right(seq(
      ':',
      optional($.method_type),
      optional($._declaration_modifiers),
      choice($.identifier, $.keyword_identifier),
      repeat($._declaration_modifiers),
    )),

    c_method_parameter: $ => prec.left(seq(
      $._declaration_specifiers,
      commaSep1(prec.right(field('declarator', choice(
        $._declarator,
        $.init_declarator,
      )))),
    )),

    struct_declaration: $ => seq(
      repeat1($.specifier_qualifier),
      commaSep1($.struct_declarator),
      optional($._declaration_modifiers),
      ';',
    ),

    atomic_declaration: $ => seq(
      '_Atomic',
      '(',
      $._type_specifier,
      ')',
      $._field_identifier,
      ';',
    ),

    alignas_specifier: $ => seq('_Alignas', '(', $._type_specifier, ')'),

    preproc_block: $ => prec.right(seq(
      $.identifier,
      '\n',
      repeat($._top_level_item),
      $.identifier,
      '\n',
    )),

    specifier_qualifier: $ => prec.right(choice(
      $._type_specifier,
      $.type_qualifier,
      $.protocol_qualifier,
    )),

    struct_declarator: $ => choice(
      $._declarator,
      seq(optional($._declarator), ':', $._expression),
    ),

    field_declaration: $ => seq(
      $._declaration_specifiers,
      commaSep(field('declarator', choice($._field_declarator, $.enum_specifier))),
      optional($.bitfield_clause),
      optional($.attribute_specifier),
      ';',
    ),

    function_declarator: $ => prec.right(1, seq(
      field('declarator', $._declarator),
      field('parameters', $.parameter_list),
      repeat(prec(1,
        choice(
          $.attribute_specifier,
          $.type_qualifier,
          seq($.type_name, ';'),
        ),
      )),
    )),
    function_field_declarator: $ => prec.right(1, seq(
      field('declarator', $._field_declarator),
      field('parameters', $.parameter_list),
      repeat(choice($.attribute_specifier, $.type_qualifier)),
    )),
    function_type_declarator: $ => prec.right(1, seq(
      field('declarator', $._type_declarator),
      field('parameters', $.parameter_list),
      repeat(choice($.attribute_specifier, $.type_qualifier)),
    )),
    abstract_function_declarator: $ => prec.right(1, seq(
      field('declarator', optional($._abstract_declarator)),
      field('parameters', $.parameter_list),
      repeat(choice($.attribute_specifier, $.type_qualifier)),
    )),

    try_statement: $ => seq(
      choice('@try', '__try'),
      $.compound_statement,
      choice(
        seq(repeat1($.catch_clause), optional($.finally_clause)),
        $.finally_clause,
      ),
    ),

    catch_clause: $ => seq(
      choice('@catch', '__catch'),
      optional(seq('(', choice('...', $.type_name), ')')),
      $.compound_statement,
    ),

    finally_clause: $ => seq(
      choice('@finally', '__finally'),
      $.compound_statement,
    ),

    throw_statement: $ => seq(
      '@throw',
      optional($._expression),
      ';',
    ),

    selector_expression: $ => prec.left(seq(
      '@selector',
      repeat1('('),
      choice($.identifier, $.method_identifier, prec(-1, /[^)]*/)),
      repeat1(')'),
    )),

    available_expression: $ => seq(
      choice('@available', '__builtin_available'),
      '(',
      commaSep1(choice(
        $.identifier,
        seq($.identifier, $.version),
        '*',
      )),
      ')',
    ),

    range_expression: $ => prec.right(seq($._expression, '...', $._expression)),

    block_literal: $ => seq(
      '^',
      optional($.attribute_specifier),
      optional($.type_name),
      optional($.attribute_specifier),
      optional($.parameter_list),
      optional($.attribute_specifier),
      $.compound_statement,
    ),

    message_expression: $ => prec(C.PREC.CALL, seq(
      '[',
      field('receiver', choice($._expression, $.generic_specifier)),
      repeat1(seq(
        field('method', $.identifier),
        repeat(seq(
          ':',
          commaSep1($._expression),
        )),
      )),
      ']',
    )),

    parenthesized_expression: $ => seq(
      '(',
      choice($._expression, $.comma_expression, $.compound_statement),
      ')',
    ),

    va_arg_expression: $ => seq('va_arg', '(', $._expression, ',', $.type_descriptor, ')'),

    ms_asm_block: _ => seq(
      '__asm',
      '{',
      /[^}]*/,
      '}',
    ),

    encode_expression: $ => seq('@encode', '(', $.type_name, ')'),

    synchronized_statement: $ => seq('@synchronized', '(', commaSep1($._expression), ')', $.compound_statement),

    parenthesized_declarator: $ => prec.dynamic(C.PREC.PAREN_DECLARATOR, seq(
      '(',
      repeat($._declaration_modifiers),
      $._declarator,
      ')',
    )),
    parenthesized_field_declarator: $ => prec.dynamic(C.PREC.PAREN_DECLARATOR, seq(
      '(',
      repeat($._declaration_modifiers),
      $._field_declarator,
      ')',
    )),
    parenthesized_type_declarator: $ => prec.dynamic(C.PREC.PAREN_DECLARATOR, seq(
      '(',
      repeat($._declaration_modifiers),
      $._type_declarator,
      ')',
    )),
    abstract_parenthesized_declarator: $ => prec(1, seq(
      '(',
      repeat($._declaration_modifiers),
      $._abstract_declarator,
      ')',
    )),

    pointer_declarator: $ => prec.dynamic(1, prec.right(seq(
      optional($.ms_based_modifier),
      '*',
      repeat($.ms_pointer_modifier),
      repeat($._declaration_modifiers),
      field('declarator', $._declarator),
    ))),
    pointer_field_declarator: $ => prec.dynamic(1, prec.right(seq(
      optional($.ms_based_modifier),
      '*',
      repeat($.ms_pointer_modifier),
      repeat($._declaration_modifiers),
      field('declarator', $._field_declarator),
    ))),
    pointer_type_declarator: $ => prec.dynamic(1, prec.right(seq(
      optional($.ms_based_modifier),
      '*',
      repeat($.ms_pointer_modifier),
      repeat($._declaration_modifiers),
      field('declarator', $._type_declarator),
    ))),
    abstract_pointer_declarator: $ => prec.dynamic(1, prec.right(seq(
      '*',
      repeat($._declaration_modifiers),
      field('declarator', optional($._abstract_declarator)),
    ))),
    block_pointer_declarator: $ => prec.dynamic(1, prec.right(seq(
      '^',
      repeat($.type_qualifier),
      field('declarator', $._declarator),
    ))),
    block_pointer_field_declarator: $ => prec.dynamic(1, prec.right(seq(
      '^',
      repeat($.type_qualifier),
      field('declarator', $._field_declarator),
    ))),
    block_pointer_type_declarator: $ => prec.dynamic(1, prec.right(seq(
      '^',
      repeat($.type_qualifier),
      field('declarator', $._type_declarator),
    ))),
    abstract_block_pointer_declarator: $ => prec.dynamic(1, prec.right(seq(
      '^',
      repeat($.type_qualifier),
      field('declarator', optional($._abstract_declarator)),
    ))),

    init_declarator: $ => seq(
      field('declarator', $._declarator),
      optional($.attribute_specifier),
      '=',
      field('value', choice($.initializer_list, $._expression)),
    ),

    generic_specifier: $ => prec.right(seq(
      $._type_identifier,
      repeat1(seq(
        '<',
        commaSep1($.type_name),
        '>',
      )),
    )),

    _type_specifier: ($, original) => choice(
      original,
      $.typedefed_specifier,
      $.generic_specifier,
      $.typeof_specifier,
      $.array_type_specifier,
    ),

    typedefed_identifier: _ => choice(
      'BOOL',
      'IMP',
      'SEL',
      'Class',
      'id',
    ),

    typedefed_specifier: $ => prec.right(seq(
      $.typedefed_identifier,
      optional($.protocol_reference_list),
    )),

    array_type_specifier: $ => seq(
      $._type_specifier,
      '[',
      optional(seq(repeat($.type_qualifier), $._expression)),
      ']',
    ),

    atdef_field: $ => seq('@defs', '(', $.identifier, ')'),

    _field_declaration_list_item: $ => choice(
      $.field_declaration,
      $.preproc_def,
      $.preproc_function_def,
      $.preproc_call,
      alias($.preproc_if_in_field_declaration_list, $.preproc_if),
      alias($.preproc_ifdef_in_field_declaration_list, $.preproc_ifdef),
      $.atdef_field,
    ),

    protocol_qualifier: _ => choice(
      'out',
      'inout',
      'bycopy',
      'byref',
      'oneway',
      'in',
    ),

    type_name: $ => prec.right(seq(
      repeat1(prec.right(choice($.specifier_qualifier, $.attribute_specifier, $._declarator))),
      optional($.protocol_reference_list),
      optional($._abstract_declarator),
    )),

    at_expression: $ => prec.right(seq(
      '@',
      $._expression,
    )),

    number_literal: $ => {
      const separator = '\'';
      const hex = /[0-9a-fA-F]/;
      const decimal = /[0-9]/;
      const hexDigits = seq(repeat1(hex), repeat(seq(separator, repeat1(hex))));
      const decimalDigits = seq(repeat1(decimal), repeat(seq(separator, repeat1(decimal))));
      return token(seq(
        optional(/[-\+]/),
        optional(choice('0x', '0b')),
        choice(
          seq(
            choice(
              decimalDigits,
              seq('0b', decimalDigits),
              seq('0x', hexDigits),
            ),
            optional(seq('.', optional(hexDigits))),
          ),
          seq('.', decimalDigits),
        ),
        optional(seq(
          /[eEpP]/,
          optional(seq(
            optional(/[-\+]/),
            hexDigits,
          )),
        )),
        repeat(choice('i', 'u', 'l', 'U', 'L', 'f', 'F')),
      ));
    },

    string_literal: $ => seq(
      choice(seq('@', '"'), 'L"', 'u"', 'U"', 'u8"', '"'),
      repeat(choice(
        token.immediate(prec(1, /[^\\"\n]+/)),
        $.escape_sequence,
      )),
      '"',
    ),

    dictionary_literal: $ => seq(
      '@',
      '{',
      optional(seq(
        commaSep1($.dictionary_pair),
        optional(','),
      )),
      '}',
    ),

    dictionary_pair: $ => seq($._expression, ':', $._expression),

    array_literal: $ => seq(
      '@',
      '[',
      optional(seq(
        commaSep1($._expression),
        optional(','),
      )),
      ']',
    ),

    identifier: _ => /[$a-zA-Z_](\w|\$)*/,

    method_identifier: $ => prec.right(seq(
      optional($.identifier),
      repeat1(token.immediate(':')),
      repeat(seq(
        $.identifier,
        repeat1(token.immediate(':')),
      )),
    )),

    keyword_identifier: $ => alias(
      prec(-3,
        choice(
          'id',
          'in',
          'struct',
        ),
      ),
      $.identifier,
    ),

    comment: _ => token(choice(
      seq('//', /(\\+(.|\r?\n)|[^\\\n])*/),
      seq(
        '/*',
        /[^*]*\*+([^/*][^*]*\*+)*/,
        '/',
      ),
    )),
  },
});

/**
 *
 * @param {string} suffix
 *
 * @param {any} content
 *
 * @return {any}
 */
function preprocIf(suffix, content) {
  /**
    *
    * @param {GrammarSymbols<string>} $
    *
    * @return {ChoiceRule}
    *
    */
  function elseBlock($) {
    return choice(
      suffix ? alias($['preproc_else' + suffix], $.preproc_else) : $.preproc_else,
      suffix ? alias($['preproc_elif' + suffix], $.preproc_elif) : $.preproc_elif,
    );
  }

  return {
    ['preproc_if' + suffix]: $ => seq(
      preprocessor('if'),
      field('condition', $._preproc_expression),
      '\n',
      repeat(prec(2, content($))),
      field('alternative', optional(elseBlock($))),
      preprocessor('endif'),
    ),

    ['preproc_ifdef' + suffix]: $ => seq(
      choice(preprocessor('ifdef'), preprocessor('ifndef')),
      field('name', $.identifier),
      repeat(prec(2, content($))),
      field('alternative', optional(elseBlock($))),
      preprocessor('endif'),
    ),

    ['preproc_else' + suffix]: $ => seq(
      preprocessor('else'),
      repeat(prec(2, content($))),
    ),

    ['preproc_elif' + suffix]: $ => seq(
      preprocessor('elif'),
      field('condition', $._preproc_expression),
      '\n',
      repeat(prec(2, content($))),
      field('alternative', optional(elseBlock($))),
    ),
  };
}


/**
  * Creates a preprocessor regex rule
  *
  * @param {RegExp|Rule|String} command
  *
  * @return {AliasRule}
  */
function preprocessor(command) {
  return alias(new RegExp('#[ \t]*' + command), '#' + command);
}

/**
 * Creates a rule to optionally match one or more of the rules separated by a comma
 *
 * @param {Rule} rule
 *
 * @return {ChoiceRule}
 *
 */
function commaSep(rule) {
  return optional(commaSep1(rule));
}

/**
 * Creates a rule to match one or more of the rules separated by a comma
 *
 * @param {Rule} rule
 *
 * @return {SeqRule}
 *
 */
function commaSep1(rule) {
  return seq(rule, repeat(seq(',', rule)));
}

/**
 * Creates a rule to match optionally match one or more of the rules
 * separated by a comma  and optionally ending with a comma
 *
 * @param {Rule} rule
 *
 * @return {ChoiceRule}
 *
 */
function optionalCommaSep(rule) {
  return optional(optionalCommaSep1(rule));
}

/**
 * Creates a rule to match one or more of the rules separated by a comma
 * and optionally ending with a comma
 *
 * @param {Rule} rule
 *
 * @return {SeqRule}
 *
 */
function optionalCommaSep1(rule) {
  return seq(rule, repeat(seq(optional(','), rule)));
}
