module.exports = grammar(require("tree-sitter-c/grammar"), {
  name: 'cpp',

  conflicts: ($, original) => original.concat([
    // foo < b
    //  ^-- template name or expression?
    [$.template_call, $._expression],

    [$._declarator, $._type_specifier],
    [$._declarator, $._type_specifier, $._expression],
    [$._declarator, $._type_specifier, $.macro_type_specifier],
    [$._declarator, $._type_specifier, $._expression, $.macro_type_specifier],
    [$._declarator, $._expression],
  ]),

  rules: {
    _top_level_item: ($, original) => choice(
      original,
      $.namespace_definition,
      $.using_declaration,
      $.constructor_definition
    ),

    // Types

    _type_specifier: ($, original) => choice(
      original,
      $.scoped_identifier,
      $.template_call,
      $.auto
    ),

    // The `auto` storage class is removed in C++0x in order to allow for the `auto` type.
    storage_class_specifier: ($, original) => choice(
      ...original.members.filter(member => member.value !== 'auto')
    ),

    auto: $ => 'auto',

    // Declarations

    constructor_definition: $ => seq(
      $.function_declarator,
      optional($.member_initializer_list),
      $.compound_statement
    ),

    member_initializer_list: $ => seq(
      ':',
      commaSep1($.member_initializer)
    ),

    member_initializer: $ => seq(
      choice(
        $.identifier,
        $.scoped_identifier
      ),
      choice(
        $.initializer_list,
        $.argument_list
      )
    ),

    _declarator: ($, original) => choice(
      original,
      $.reference_declarator,
      $.scoped_identifier
    ),

    function_declarator: ($, original) => seq(
      original,
      repeat(choice(
        $.type_qualifier
      ))
    ),

    _abstract_declarator: ($, original) => choice(
      original,
      $.abstract_reference_declarator
    ),

    reference_declarator: $ => prec.right(seq(
      '&',
      $._declarator
    )),

    abstract_reference_declarator: $ => prec.right(seq(
      '&',
      optional($._abstract_declarator)
    )),

    template_call: $ => seq(
      choice(
        $.identifier,
        $.scoped_identifier
      ),
      '<',
      commaSep1(choice(
        $.type_name,
        $.parenthesized_expression
      )),
      '>'
    ),

    namespace_definition: $ => seq(
      'namespace',
      optional($.identifier),
      $.declaration_list
    ),

    using_declaration: $ => seq(
      'using',
      choice(
        $.identifier,
        $.scoped_identifier
      ),
      ';'
    ),

    // Statements

    return_statement: ($, original) => choice(
      original,
      seq(
        'return',
        $.initializer_list,
        ';'
      )
    ),

    // Expressions

    _expression: ($, original) => choice(
      original,
      $.template_call,
      $.scoped_identifier
    ),

    scoped_identifier: $ => prec(1, seq(
      optional(choice(
        $.scoped_identifier,
        $.identifier
      )),
      '::',
      $.identifier
    ))
  }
});

function commaSep1(rule) {
  return seq(rule, repeat(seq(',', rule)))
}
