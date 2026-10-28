import { type Ref, useCallback } from "react";
import {
	type NativeSyntheticEvent,
	Platform,
	type TextInput,
	type TextInputScrollEventData,
	type TextInputSelectionChangeEventData,
	View,
} from "react-native";
import Animated, {
	useAnimatedStyle,
	useEvent,
	useSharedValue,
} from "react-native-reanimated";
import {
	useMobileColors,
	useMobileStyles,
} from "../../ui/theme/useMobileTheme";
import type { MobileMarkdownTextSelection } from "../../workspace/mobileMarkdownSourceSelection";
import { Input } from "../ui/input";
import { Text } from "../ui/text";
import { createSourceEditorStyles } from "./MobileMarkdownSourceEditorStyles";
import {
	type SourceFindRange,
	sourceFindSyntaxTokens,
} from "./MobileSourceFindHighlight";

type SourceEditorInputProps = {
	inputRef: Ref<TextInput>;
	findMatch?: SourceFindRange | null;
	editable: boolean;
	onBlur?: () => void;
	onChangeText: (value: string) => void;
	onSelectionChange: (
		event: NativeSyntheticEvent<TextInputSelectionChangeEventData>,
	) => void;
	selection?: MobileMarkdownTextSelection;
	testID: string;
	value: string;
};

const AnimatedInput = Animated.createAnimatedComponent(Input);

export function SourceEditorInput(props: SourceEditorInputProps) {
	const {
		inputRef,
		findMatch,
		editable,
		onBlur,
		onChangeText,
		onSelectionChange,
		selection,
		testID,
		value,
	} = props;
	const { editorStyles } = useMobileStyles(createSourceEditorStyles);
	const mobileColors = useMobileColors();
	const scrollY = useSharedValue(0);
	const syntaxTransform = useAnimatedStyle(() => ({
		transform: [{ translateY: -scrollY.value }],
	}));
	const onScroll = useEvent<NativeSyntheticEvent<TextInputScrollEventData>>(
		(event) => {
			"worklet";
			scrollY.set(event.contentOffset.y);
		},
		["onScroll"],
	);
	const onWebScroll = useCallback(
		(event: NativeSyntheticEvent<TextInputScrollEventData>) => {
			const target = event.currentTarget;
			if (
				target &&
				typeof target === "object" &&
				"scrollTop" in target &&
				typeof target.scrollTop === "number"
			)
				scrollY.set(target.scrollTop);
		},
		[scrollY],
	);
	return (
		<View style={editorStyles.sourceInputHost}>
			<Animated.View
				pointerEvents="none"
				style={[editorStyles.syntaxLayer, syntaxTransform]}
				testID="editor-markdown-syntax"
			>
				<Text style={editorStyles.syntaxText}>
					{sourceFindSyntaxTokens(value, findMatch).map((token, index) => (
						<Text
							key={`${index}:${token.text}`}
							style={[
								token.kind ? editorStyles[token.kind] : undefined,
								token.highlighted
									? {
											backgroundColor: mobileColors.yellowSoft,
											color: mobileColors.text,
										}
									: undefined,
							]}
						>
							{token.text}
						</Text>
					))}
				</Text>
			</Animated.View>
			<AnimatedInput
				ref={inputRef}
				multiline
				autoCorrect={false}
				scrollEnabled
				rejectResponderTermination={false}
				editable={editable}
				className="border-0 bg-transparent py-3 text-[15px]"
				underlineColorAndroid="transparent"
				placeholderTextColor={mobileColors.textFaint}
				selectionColor={mobileColors.primary}
				style={editorStyles.highlightedInput}
				testID={testID}
				textAlignVertical="top"
				value={value}
				selection={selection}
				onBlur={onBlur}
				onChangeText={onChangeText}
				onScroll={Platform.OS === "web" ? onWebScroll : onScroll}
				onSelectionChange={onSelectionChange}
			/>
		</View>
	);
}
