---
code: c_sdk_preset_properties
name: "Preset Properties"
wikiToken: FqqJwumdSigIILkFZYEcsLACnUg
parentWikiToken: IvaxwsdOwi8b3Ck84AzcXobtnDb
updateTime: 1774249249000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=c_sdk_preset_properties
---

The following present properties are properties that all events in SDK would have.

<lark-table rows="8" cols="4" column-widths="169,152,140,259">

  <lark-tr>
    <lark-td>
      Property name
    </lark-td>
    <lark-td>
      Display name
    </lark-td>
    <lark-td>
      Property type
    </lark-td>
    <lark-td>
      Instruction
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #ip
    </lark-td>
    <lark-td>
      IP address
    </lark-td>
    <lark-td>
      Text
    </lark-td>
    <lark-td>
      IP address of the user, based on which TE would get the geographical location of the user
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #country
    </lark-td>
    <lark-td>
      Country
    </lark-td>
    <lark-td>
      Text
    </lark-td>
    <lark-td>
      The country where the user is located; generated based on the IP address
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #country_code
    </lark-td>
    <lark-td>
      Country code
    </lark-td>
    <lark-td>
      Text
    </lark-td>
    <lark-td>
      The code of the country where the user is located (ISO 3166-1 alpha-2, two English characters in upper case); generated based on the IP address
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #province
    </lark-td>
    <lark-td>
      Province
    </lark-td>
    <lark-td>
      Text
    </lark-td>
    <lark-td>
      The province where the user is located; generated based on the IP address
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #city
    </lark-td>
    <lark-td>
      City
    </lark-td>
    <lark-td>
      Text
    </lark-td>
    <lark-td>
      The city where the user is located; generated based on the IP address
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #lib
    </lark-td>
    <lark-td>
      SDK type
    </lark-td>
    <lark-td>
      Text
    </lark-td>
    <lark-td>
      The type of SDK which you integrate, e.g., Golang, etc.
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #lib_version
    </lark-td>
    <lark-td>
      SDK version
    </lark-td>
    <lark-td>
      Text
    </lark-td>
    <lark-td>
      The version of the SDK which you integrate
    </lark-td>
  </lark-tr>
</lark-table>
