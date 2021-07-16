// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import React, { Component } from 'react';
import { Image, View, Text, TextInput, Switch, SectionList, TouchableOpacity, NativeModules } from 'react-native';
import ImagePicker from 'react-native-image-picker';

import Crashes, { ExceptionModel } from 'appcenter-crashes';

import AttachmentsProvider from '../AttachmentsProvider';
import SharedStyles from '../SharedStyles';
import CrashesTabBarIcon from '../assets/crashes.png';

export default class CrashesScreen extends Component {
  static navigationOptions = {
    tabBarIcon: () => <Image style={{ width: 24, height: 24 }} source={CrashesTabBarIcon} />,
    tabBarOnPress: ({ defaultHandler, navigation }) => {
      const refreshCrash = navigation.getParam('refreshCrash');

      // Initial press: the function is not defined yet so nothing to refresh.
      if (refreshCrash) {
        refreshCrash();
      }
      defaultHandler();
    }
  }

  state = {
    crashesEnabled: false,
    lastSessionStatus: '',
    memoryWarning: '',
    textAttachment: '',
    binaryAttachment: '',
    userId: '',
    hasTrackErrorProperties: false
  }

  async componentDidMount() {
    await this.refreshToggle();

    const crashedInLastSession = await Crashes.hasCrashedInLastSession();
    const lastSessionStatus = crashedInLastSession ? 'Crashed' : 'OK';
    this.setState({ lastSessionStatus });

    if (crashedInLastSession) {
      const crashReport = await Crashes.lastSessionCrashReport();
      const crashReportString = JSON.stringify(crashReport, null, 4);
      console.log('App crashed in the last session. Crashes.lastSessionCrashReport(): ', crashReportString);
    }

    const hasReceivedMemoryWarning = await Crashes.hasReceivedMemoryWarningInLastSession();
    const memoryWarning = hasReceivedMemoryWarning ? 'Received' : 'No';
    this.setState({ memoryWarning });

    const textAttachment = await AttachmentsProvider.getTextAttachment();
    this.setState({ textAttachment });

    const binaryAttachment = await AttachmentsProvider.getBinaryAttachmentInfo();
    this.setState({ binaryAttachment });

    this.props.navigation.setParams({
      refreshCrash: this.refreshToggle.bind(this)
    });
  }

  async refreshToggle() {
    const crashesEnabled = await Crashes.isEnabled();
    this.setState({ crashesEnabled });
  }

  jsCrash() {
    const foo = new FooClass();
    foo.method1();
  }

  async sendTrackError(hasProperties){
    try {
      throw new Error("Custom error");
    } catch(error) {
      let properties = hasProperties ?  { 'key' : 'value' } : null;
      let attachments = await AttachmentsProvider.getErrorAttachments();
      Crashes.trackError(ExceptionModel.createFromError(error), properties, attachments);
    }
  }

  async nativeCrash() {
    // In Android debug or non app store environment for iOS.
    await Crashes.generateTestCrash();

    // If the SDK disabled the test crash, use this one.
    await NativeModules.TestAppNative.generateTestCrash();
  }

  generateLowMemoryWarning() {
    const array = [];
    while (true) { // eslint-disable-line no-constant-condition
      array.push(new ArrayBuffer(128 * 1024 * 1024));
    }
  }

  async generateNativeLowMemoryWarning() {
    await NativeModules.TestAppNative.produceLowMemoryWarning();
  }

  render() {
    const switchRenderItem = ({ item: { title, value, toggle } }) => (
      <View style={SharedStyles.item}>
        <Text style={SharedStyles.itemTitle}>{title}</Text>
        <Switch value={this.state[value]} onValueChange={toggle} />
      </View>
    );

    const valueRenderItem = ({ item: { title, value, onChange } }) => {
      if (onChange) {
        return (
          <View style={SharedStyles.item}>
            <Text style={SharedStyles.itemTitle}>{title}</Text>
            <TextInput style={SharedStyles.underlinedItemInput} onChangeText={onChange}>{this.state[value]}</TextInput>
          </View>);
      }
      return (
        <View style={SharedStyles.item}>
          <Text style={SharedStyles.itemTitle}>{title}</Text>
          <Text>{this.state[value]}</Text>
        </View>);
    };

    const actionRenderItem = ({ item: { title, action } }) => (
      <TouchableOpacity style={SharedStyles.item} onPress={action}>
        <Text style={SharedStyles.itemButton}>{title}</Text>
      </TouchableOpacity>
    );

    return (
      <View style={SharedStyles.container}>
        <SectionList
          renderItem={({ item }) => <Text style={[SharedStyles.item, SharedStyles.itemTitle]}>{item}</Text>}
          renderSectionHeader={({ section: { title } }) => <Text style={SharedStyles.header}>{title}</Text>}
          keyExtractor={(item, index) => item + index}
          sections={[
            {
              title: 'Settings',
              data: [
                {
                  title: 'Crashes Enabled',
                  value: 'crashesEnabled',
                  toggle: async () => {
                    await Crashes.setEnabled(!this.state.crashesEnabled);
                    const crashesEnabled = await Crashes.isEnabled();
                    this.setState({ crashesEnabled });
                  }
                },
              ],
              renderItem: switchRenderItem
            },
            {
              title: 'Actions',
              data: [
                {
                  title: 'Crash JavaScript',
                  action: this.jsCrash
                },
                {
                  title: 'Crash native code',
                  action: this.nativeCrash
                },
                {
                  title: 'Generate low memory warning',
                  action: this.generateLowMemoryWarning
                },
                {
                  title: 'Generate low memory warning from native code',
                  action: this.generateNativeLowMemoryWarning
                },
                {
                  title: 'Select image as binary error attachment',
                  action: this.showFilePicker
                },
              ],
              renderItem: actionRenderItem
            },
            {
              title: 'Track error properties settings',
              data: [
                {
                  title: 'Track with properties', 
                  value: 'hasTrackErrorProperties',
                  toggle: () => {
                    const hasTrackErrorProperties = !this.state.hasTrackErrorProperties;
                    this.setState({ hasTrackErrorProperties });
                  }
                },
              ],
              renderItem: switchRenderItem
            },
            {
              title: 'Track error settings',
              data: [
                {
                 title: 'Track error',
                 action: () => this.sendTrackError(this.state.hasTrackErrorProperties)
                },
              ],
              renderItem: actionRenderItem
            },
            {
              title: 'Miscellaneous',
              data: [
                { title: 'Last session status', value: 'lastSessionStatus' },
                { title: 'Memory warning', value: 'memoryWarning' },
                { title: 'Binary attachment', value: 'binaryAttachment' },
                {
                  title: 'Text attachment',
                  value: 'textAttachment',
                  onChange: (textAttachment) => {
                    this.setState({ textAttachment });
                    AttachmentsProvider.saveTextAttachment(textAttachment);
                  }
                }
              ],
              renderItem: valueRenderItem
            },
          ]}
        />
      </View>
    );
  }

  showFilePicker = () => {
    const options = { cancelButtonTitle: 'Delete saved image' };
    ImagePicker.showImagePicker(options, async (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
        await AttachmentsProvider.deleteBinaryAttachment();
        this.setState({ binaryAttachment: '' });
      } else if (response.error) {
        console.log('ImagePicker Error: ', response.error);
      } else {
        await AttachmentsProvider.saveBinaryAttachment(getFileName(response), response.data, getFileType(response), getFileSize(response));
        const binaryAttachmentValue = await AttachmentsProvider.getBinaryAttachmentInfo();
        this.setState({ binaryAttachment: binaryAttachmentValue });
      }
    });

    function getFileName(response) {
      let fileName = 'binary.jpeg';
      if (response.fileName) {
        fileName = response.fileName;
      }
      return fileName;
    }

    function getFileType(response) {
      let fileType = 'image/jpeg';
      if (response.type) {
        fileType = response.type;
      }
      return fileType;
    }

    function getFileSize(response) {
      const thresh = 1024;
      const units = ['KiB', 'MiB', 'GiB'];
      let fileSize = response.fileSize;
      if (Math.abs(fileSize) < thresh) {
        return `${fileSize} B`;
      }
      let u = -1;
      do {
        fileSize /= thresh;
        ++u;
      } while (Math.abs(fileSize) >= thresh && u < units.length - 1);
      return `${fileSize.toFixed(1)} ${units[u]}`;
    }
  }
}

class BarClass {
  static barMethod1(value1, value2) {
    this.crashApp(value1, value2);
  }

  /* eslint-disable */
  static crashApp(value1, value2) {
    let thisVariableIsUndefined;
    thisVariableIsUndefined.invokingFunctionOnUndefined();
  }
  /* eslint-enable */
}

class FooClass {
  method1(value) {
    return this.method2(value);
  }

  method2(value) {
    return this.fooInnermostMethod(value);
  }

  fooInnermostMethod() {
    return BarClass.barMethod1();
  }
}
