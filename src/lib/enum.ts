export class Bitflags<T extends number> {
  private _value: number;
  public get bits(): number {
    return this._value;
  }
  public static factory<T extends number>(): (value?: T) => Bitflags<T> {
    return (value?: T) => {
      return new Bitflags(value);
    };
  }
  constructor(value?: T) {
    this._value = value == undefined ? 0 : value.valueOf();
  }
  public set(flags: T): this {
    this._value |= flags.valueOf();
    return this;
  }
  public unset(flags: T): this {
    this._value &= ~flags.valueOf();
    return this;
  }
  public toggle(flags: T): this {
    this._value ^= flags.valueOf();
    return this;
  }
  public has(flags: T): boolean {
    return (this._value & flags.valueOf()) != 0;
  }
}
