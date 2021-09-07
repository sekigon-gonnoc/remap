/* eslint-disable no-undef */
import React from 'react';
import './Keycodes.scss';
import { Button, TextField, InputAdornment } from '@material-ui/core';
import SearchIcon from '@material-ui/icons/Search';
import KeycodeKey from '../keycodekey/KeycodeKey.container';
import { KeycodesActionsType, KeycodesStateType } from './Keycodes.container';
import { IKeycodeCategory } from '../../../services/hid/Hid';
import KeycodeAddKey from '../keycodekey/any/AddAnyKeycodeKey.container';
import { KeyCategory } from '../../../services/hid/KeyCategoryList';
import { genKeys, Key } from '../keycodekey/KeyGen';
import { CATEGORY_LABEL_BMP } from '../../../services/hid/KeycodeInfoListBmp';
import { KeyboardLabelLang } from '../../../services/labellang/KeyLabelLangs';
import {
  CATEGORY_LABEL_ASCII,
  macroCodeFilter,
} from '../../../services/hid/MacroCodes';

type OwnProps = {};

type KeycodesProps = OwnProps &
  Partial<KeycodesActionsType> &
  Partial<KeycodesStateType>;

type OwnState = {
  category: string;
  categoryKeys: { [category: string]: Key[] };
  searchText: string;
};

export default class Keycodes extends React.Component<KeycodesProps, OwnState> {
  constructor(props: KeycodesProps | Readonly<KeycodesProps>) {
    super(props);
    this.state = {
      category: 'Basic',
      categoryKeys: {},
      searchText: '',
    };
  }

  private addAsciiCategory(categoryKeys: { [category: string]: Key[] }) {
    const asciiLabel: string = CATEGORY_LABEL_ASCII;
    if (!Object.prototype.hasOwnProperty.call(categoryKeys, asciiLabel)) {
      categoryKeys[asciiLabel] = genKeys(KeyCategory.ascii());
    }
  }

  private addBmpCategory(
    categoryKeys: { [category: string]: Key[] },
    macroEditMode: boolean
  ) {
    const bmpLabel: string = CATEGORY_LABEL_BMP;
    const bmp = macroEditMode
      ? macroCodeFilter(KeyCategory.bmp())
      : KeyCategory.bmp();
    if (!Object.prototype.hasOwnProperty.call(categoryKeys, bmpLabel)) {
      categoryKeys[bmpLabel] = genKeys(bmp, this.props.labelLang!);
    }
  }

  /**
   * Filter keys matching with the label and meta case-insensitive.
   * Sort them with prefix matching.
   * The label keys are listed higher than the meta keys.
   */
  private filterKeys(searchKey: string): Key[] {
    const search = searchKey.toLowerCase();
    let allKeys: Key[] = Object.values(this.state.categoryKeys).flat();

    // match with label & meta
    const labelKeys = allKeys.filter(
      (key) => 0 <= key.label.toLowerCase().indexOf(search)
    );
    const keywordKeys = allKeys.filter(
      (key) => 0 <= key.keymap.keycodeInfo.keywords.join('').indexOf(search)
    );
    const metaKeys = allKeys.filter(
      (key) => 0 <= key.meta.toLowerCase().indexOf(search)
    );

    const labelSortedKeys = labelKeys.sort(
      (k0, k1) =>
        k0.label.toLowerCase().indexOf(search) -
        k1.label.toLowerCase().indexOf(search)
    );

    const keywordSortKeys = keywordKeys.sort((k0, k1) => {
      const index0 = k0.keymap.keycodeInfo.keywords.reduce(
        (i, kwd) => Math.min(i, kwd.indexOf(search)),
        0
      );
      const index1 = k1.keymap.keycodeInfo.keywords.reduce(
        (i, kwd) => Math.min(i, kwd.indexOf(search)),
        0
      );
      return index0 - index1;
    });

    const metaSortedKeys = metaKeys.sort(
      (k0, k1) =>
        k0.meta.toLowerCase().indexOf(search) -
        k1.meta.toLowerCase().indexOf(search)
    );

    // Priority: label > keywords > meta
    return Array.from(
      new Set(labelSortedKeys.concat(keywordSortKeys, metaSortedKeys))
    );
  }

  private removeBmpCategory(categoryKeys: { [category: string]: Key[] }) {
    const bmpLabel: string = CATEGORY_LABEL_BMP;
    if (Object.prototype.hasOwnProperty.call(categoryKeys, bmpLabel)) {
      delete categoryKeys[bmpLabel];
    }
  }

  private removeAsciiCategory(categoryKeys: { [category: string]: Key[] }) {
    const asciiLabel: string = CATEGORY_LABEL_ASCII;
    if (Object.prototype.hasOwnProperty.call(categoryKeys, asciiLabel)) {
      delete categoryKeys[asciiLabel];
    }
  }

  private onChangeSearchText(event: any) {
    const searchText = event.target.value;
    this.setState({ searchText });
  }

  private refreshCategoryKeys(
    labelLang: KeyboardLabelLang,
    macroEditMode: boolean
  ) {
    const basic = macroEditMode
      ? macroCodeFilter(KeyCategory.basic(labelLang))
      : KeyCategory.basic(labelLang);
    const symbol = macroEditMode
      ? macroCodeFilter(KeyCategory.symbol(labelLang))
      : KeyCategory.symbol(labelLang);
    const functions = [
      ...(macroEditMode
        ? macroCodeFilter(KeyCategory.functions(labelLang))
        : KeyCategory.functions(labelLang)),
      ...KeyCategory.macro(),
    ];
    const layers = macroEditMode
      ? macroCodeFilter(KeyCategory.layer(this.props.layerCount!))
      : KeyCategory.layer(this.props.layerCount!);
    const device = macroEditMode
      ? macroCodeFilter(KeyCategory.device(labelLang))
      : KeyCategory.device(labelLang);
    const special = macroEditMode
      ? macroCodeFilter(KeyCategory.special(labelLang))
      : KeyCategory.special(labelLang);
    const midi = macroEditMode
      ? macroCodeFilter(KeyCategory.midi())
      : KeyCategory.midi();

    const categoryKeys: { [category: string]: Key[] } = {
      Basic: genKeys(basic, this.props.labelLang!),
      Symbol: genKeys(symbol, this.props.labelLang!),
      Functions: genKeys(functions, this.props.labelLang!),
      Layer: genKeys(layers, this.props.labelLang!),
      Device: genKeys(device, this.props.labelLang!),
      // Macro: genKeys(KeyCategory.macro()),
      Special: genKeys(special, this.props.labelLang!),
      Midi: genKeys(midi, this.props.labelLang!),
    };
    if (this.props.bleMicroPro && !macroEditMode) {
      this.addBmpCategory(categoryKeys, macroEditMode);
    } else {
      this.removeBmpCategory(categoryKeys);
    }

    if (macroEditMode) {
      this.rewriteQmkLabels(categoryKeys.Basic);
      this.addAsciiCategory(categoryKeys);
    } else {
      this.removeAsciiCategory(categoryKeys);
    }

    this.setState({ categoryKeys });
  }

  /**
   * Change the label of A-Z with QMK keycode to lower case when Macro Edit Mode
   * because it's easy for users to understand the actual keycode the macro has.
   * The macro which includes KC_A will send the key of 'a' not 'A'.
   * @param keys target Key array
   */
  private rewriteQmkLabels(keys: Key[]) {
    const codeA = 4; // KC_A
    const codeZ = 29; // KC_Z
    keys.forEach((key) => {
      const code = key.keymap.code;
      if (codeA <= code && code <= codeZ) {
        key.label = key.label.toLowerCase();
      }
    });
  }

  // eslint-disable-next-line no-unused-vars
  shouldComponentUpdate(nextProps: KeycodesProps, _nextState: OwnState) {
    if (this.props.layerCount != nextProps.layerCount) {
      const keys: Key[] = genKeys(
        KeyCategory.layer(nextProps.layerCount!),
        this.props.labelLang!
      );
      const categoryKeys = this.state.categoryKeys;
      categoryKeys['Layer'] = keys;
      this.setState({ categoryKeys: categoryKeys });
    }

    return true;
  }

  componentDidMount() {
    this.refreshCategoryKeys(this.props.labelLang!, false);
  }

  componentDidUpdate(prevProps: KeycodesProps) {
    if (
      this.props.labelLang != prevProps.labelLang ||
      this.props.macroKey != prevProps.macroKey
    ) {
      this.refreshCategoryKeys(
        prevProps.labelLang || 'en-us',
        Boolean(this.props.macroKey)
      );
    }
  }

  selectCategory = (category: string) => {
    // clear the search text
    const searchText = '';
    this.setState({ category, searchText });
  };

  render() {
    let keys: Key[];
    if (this.state.searchText) {
      keys = this.filterKeys(this.state.searchText);
    } else if (this.state.category) {
      keys = this.state.categoryKeys[this.state.category] || [];
    } else {
      keys = [];
    }
    const macrEditMode = this.props.macroKey != null;
    return (
      <React.Fragment>
        <div className="key-categories">
          {Object.keys(this.state.categoryKeys).map((cat, index) => {
            const len = this.state.categoryKeys[cat].length;
            return (
              <div
                className={[
                  'key-category',
                  len === 0 && 'key-category-empty-keys',
                ].join(' ')}
                key={index}
              >
                <Button
                  disabled={this.state.category === cat || len === 0}
                  onClick={this.selectCategory.bind(this, cat)}
                >
                  {cat}
                </Button>
              </div>
            );
          })}
          <div className="key-category">
            <TextField
              className="keycodes-search"
              size="small"
              type="search"
              value={this.state.searchText}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              onChange={this.onChangeSearchText.bind(this)}
            />
          </div>
        </div>
        <div
          className="keycodes"
          style={{
            minWidth:
              this.props.keyboardWidth! + 144 /* = (PADDING + KeycodeKey)*2 */,
          }}
        >
          {keys.map((key, index) => {
            const isMacro = key.keymap.kinds.includes('macro');
            return (
              <KeycodeKey
                index={index}
                key={`${this.state.category}${index}`}
                value={key}
                draggable={true}
                clickable={isMacro && !macrEditMode}
              />
            );
          })}
          {this.state.category == IKeycodeCategory.ANY && (
            <KeycodeAddKey key={'add'} />
          )}
        </div>

        {(this.props.draggingKey || this.props.testMatrix) && (
          <div className="dragMask"></div>
        )}
      </React.Fragment>
    );
  }
}

type MacroType = {
  selectedKey?: Key | null;
  macroText?: string | null;

  // eslint-disable-next-line no-unused-vars
  onChangeMacroText: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
};

// eslint-disable-next-line no-unused-vars
function Macro(props: MacroType) {
  return (
    <div className="macro-wrapper">
      <div className="macro">
        <hr />
        {props.selectedKey ? (
          <div>{props.selectedKey!.label}</div>
        ) : (
          'Please click above key to input its macro'
        )}

        <textarea
          placeholder={'{KC_A,KC_NO,KC_A,KC_B}'}
          onChange={props.onChangeMacroText}
          disabled={!props.selectedKey}
          value={props.macroText || ''}
        ></textarea>
        <div>
          Enter text directry, or wrap{' '}
          <a href="https://beta.docs.qmk.fm/using-qmk/simple-keycodes/keycodes_basic">
            Basic Keycodes
          </a>{' '}
          in {'{}'}.
        </div>
        <div>
          Single tap: {'{KC_XXX}'}, Chord: {'{KC_XXX, KC_YYY, KC_ZZZ}'}.
        </div>
        <div>Type ? to search for keycodes.</div>
      </div>
    </div>
  );
}
