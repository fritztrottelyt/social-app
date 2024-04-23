import React from 'react'
import {ActivityIndicator, Pressable, StyleSheet, View} from 'react-native'
import {AppBskyActorDefs} from '@atproto/api'
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {useFocusEffect} from '@react-navigation/native'
import {NativeStackScreenProps} from '@react-navigation/native-stack'

import {track} from '#/lib/analytics/analytics'
import {logger} from '#/logger'
import {
  usePreferencesQuery,
  useSetSaveFeedsMutation,
  useUpdateSavedFeedMutation,
} from '#/state/queries/preferences'
import {UsePreferencesQueryResponse} from '#/state/queries/preferences/types'
import {useSetMinimalShellMode} from '#/state/shell'
import {useAnalytics} from 'lib/analytics/analytics'
import {useHaptics} from 'lib/haptics'
import {usePalette} from 'lib/hooks/usePalette'
import {useWebMediaQueries} from 'lib/hooks/useWebMediaQueries'
import {CommonNavigatorParams} from 'lib/routes/types'
import {colors, s} from 'lib/styles'
import {FeedSourceCard} from 'view/com/feeds/FeedSourceCard'
import {TextLink} from 'view/com/util/Link'
import {Text} from 'view/com/util/text/Text'
import * as Toast from 'view/com/util/Toast'
import {ViewHeader} from 'view/com/util/ViewHeader'
import {CenteredView, ScrollView} from 'view/com/util/Views'
import {atoms as a, useTheme} from '#/alf'
import {FilterTimeline_Stroke2_Corner0_Rounded as FilterTimeline} from '#/components/icons/FilterTimeline'

const HITSLOP_TOP = {
  top: 20,
  left: 20,
  bottom: 5,
  right: 20,
}
const HITSLOP_BOTTOM = {
  top: 5,
  left: 20,
  bottom: 20,
  right: 20,
}

type Props = NativeStackScreenProps<CommonNavigatorParams, 'SavedFeeds'>
export function SavedFeeds({}: Props) {
  const pal = usePalette('default')
  const {_} = useLingui()
  const {isMobile, isTabletOrDesktop} = useWebMediaQueries()
  const {screen} = useAnalytics()
  const setMinimalShellMode = useSetMinimalShellMode()
  const {data: preferences} = usePreferencesQuery()
  const {
    mutateAsync: setSavedFeeds,
    variables: optimisticSavedFeedsResponse,
    reset: resetSaveFeedsMutationState,
    error: setSavedFeedsError,
  } = useSetSaveFeedsMutation()

  /*
   * Use optimistic data if exists and no error, otherwise fallback to remote
   * data
   */
  const currentFeeds =
    optimisticSavedFeedsResponse && !setSavedFeedsError
      ? optimisticSavedFeedsResponse
      : preferences?.savedFeeds || []
  const pinnedFeeds = currentFeeds.filter(f => f.pinned)
  const unpinnedFeeds = currentFeeds.filter(f => !f.pinned)

  useFocusEffect(
    React.useCallback(() => {
      screen('SavedFeeds')
      setMinimalShellMode(false)
    }, [screen, setMinimalShellMode]),
  )

  return (
    <CenteredView
      style={[
        s.hContentRegion,
        pal.border,
        isTabletOrDesktop && styles.desktopContainer,
      ]}>
      <ViewHeader title={_(msg`Edit My Feeds`)} showOnDesktop showBorder />
      <ScrollView style={s.flex1} contentContainerStyle={[styles.noBorder]}>
        <View style={[pal.text, pal.border, styles.title]}>
          <Text type="title" style={pal.text}>
            <Trans>Pinned Feeds</Trans>
          </Text>
        </View>

        {preferences?.feeds ? (
          !pinnedFeeds.length ? (
            <View
              style={[
                pal.border,
                isMobile && s.flex1,
                pal.viewLight,
                styles.empty,
              ]}>
              <Text type="lg" style={[pal.text]}>
                <Trans>You don't have any pinned feeds.</Trans>
              </Text>
            </View>
          ) : (
            pinnedFeeds.map(f => (
              <ListItem
                key={f.id}
                feed={f}
                isPinned
                setSavedFeeds={setSavedFeeds}
                resetSaveFeedsMutationState={resetSaveFeedsMutationState}
                currentFeeds={currentFeeds}
                preferences={preferences}
              />
            ))
          )
        ) : (
          <ActivityIndicator style={{marginTop: 20}} />
        )}
        <View style={[pal.text, pal.border, styles.title]}>
          <Text type="title" style={pal.text}>
            <Trans>Saved Feeds</Trans>
          </Text>
        </View>
        {preferences?.feeds ? (
          !unpinnedFeeds.length ? (
            <View
              style={[
                pal.border,
                isMobile && s.flex1,
                pal.viewLight,
                styles.empty,
              ]}>
              <Text type="lg" style={[pal.text]}>
                <Trans>You don't have any saved feeds.</Trans>
              </Text>
            </View>
          ) : (
            unpinnedFeeds.map(f => (
              <ListItem
                key={f.id}
                feed={f}
                isPinned={false}
                setSavedFeeds={setSavedFeeds}
                resetSaveFeedsMutationState={resetSaveFeedsMutationState}
                currentFeeds={currentFeeds}
                preferences={preferences}
              />
            ))
          )
        ) : (
          <ActivityIndicator style={{marginTop: 20}} />
        )}

        <View style={styles.footerText}>
          <Text type="sm" style={pal.textLight}>
            <Trans>
              Feeds are custom algorithms that users build with a little coding
              expertise.{' '}
              <TextLink
                type="sm"
                style={pal.link}
                href="https://github.com/bluesky-social/feed-generator"
                text={_(msg`See this guide`)}
              />{' '}
              for more information.
            </Trans>
          </Text>
        </View>
        <View style={{height: 100}} />
      </ScrollView>
    </CenteredView>
  )
}

function ListItem({
  feed,
  isPinned,
  currentFeeds,
  setSavedFeeds,
  resetSaveFeedsMutationState,
}: {
  feed: AppBskyActorDefs.SavedFeed
  isPinned: boolean
  currentFeeds: AppBskyActorDefs.SavedFeed[]
  setSavedFeeds: ReturnType<typeof useSetSaveFeedsMutation>['mutateAsync']
  resetSaveFeedsMutationState: ReturnType<
    typeof useSetSaveFeedsMutation
  >['reset']
  preferences: UsePreferencesQueryResponse
}) {
  const pal = usePalette('default')
  const {_} = useLingui()
  const playHaptic = useHaptics()
  const {isPending: isUpdatePending, mutateAsync: updateFeed} =
    useUpdateSavedFeedMutation()
  const feedUri = feed.value

  const onTogglePinned = React.useCallback(async () => {
    playHaptic()

    try {
      resetSaveFeedsMutationState()

      if (feed.pinned) {
        await updateFeed({
          ...feed,
          pinned: false,
        })
      } else {
        await updateFeed({
          ...feed,
          pinned: true,
        })
      }
    } catch (e) {
      Toast.show(_(msg`There was an issue contacting the server`))
      logger.error('Failed to toggle pinned feed', {message: e})
    }
  }, [_, playHaptic, feed, updateFeed, resetSaveFeedsMutationState])

  const onPressUp = React.useCallback(async () => {
    if (!isPinned) return

    const nextFeeds = currentFeeds.slice()
    const ids = currentFeeds.map(f => f.id)
    const index = ids.indexOf(feed.id)
    const nextIndex = index - 1

    if (index === -1 || index === 0) return
    ;[nextFeeds[index], nextFeeds[nextIndex]] = [
      nextFeeds[nextIndex],
      nextFeeds[index],
    ]

    try {
      await setSavedFeeds(nextFeeds)
      track('CustomFeed:Reorder', {
        uri: feed.value,
        index: nextIndex,
      })
    } catch (e) {
      Toast.show(_(msg`There was an issue contacting the server`))
      logger.error('Failed to set pinned feed order', {message: e})
    }
  }, [feed, isPinned, setSavedFeeds, currentFeeds, _])

  const onPressDown = React.useCallback(async () => {
    if (!isPinned) return

    const nextFeeds = currentFeeds.slice()
    const ids = currentFeeds.map(f => f.id)
    const index = ids.indexOf(feed.id)
    const nextIndex = index + 1

    if (index === -1 || index >= nextFeeds.length - 1) return
    ;[nextFeeds[index], nextFeeds[nextIndex]] = [
      nextFeeds[nextIndex],
      nextFeeds[index],
    ]

    try {
      await setSavedFeeds(nextFeeds)
      track('CustomFeed:Reorder', {
        uri: feed.value,
        index: nextIndex,
      })
    } catch (e) {
      Toast.show(_(msg`There was an issue contacting the server`))
      logger.error('Failed to set pinned feed order', {message: e})
    }
  }, [feed, isPinned, setSavedFeeds, currentFeeds, _])

  return (
    <View style={[styles.itemContainer, pal.border]}>
      {isPinned ? (
        <View style={styles.webArrowButtonsContainer}>
          <Pressable
            disabled={isUpdatePending}
            accessibilityRole="button"
            onPress={onPressUp}
            hitSlop={HITSLOP_TOP}
            style={state => ({
              opacity:
                state.hovered || state.focused || isUpdatePending ? 0.5 : 1,
            })}>
            <FontAwesomeIcon
              icon="arrow-up"
              size={12}
              style={[pal.text, styles.webArrowUpButton]}
            />
          </Pressable>
          <Pressable
            disabled={isUpdatePending}
            accessibilityRole="button"
            onPress={onPressDown}
            hitSlop={HITSLOP_BOTTOM}
            style={state => ({
              opacity:
                state.hovered || state.focused || isUpdatePending ? 0.5 : 1,
            })}>
            <FontAwesomeIcon icon="arrow-down" size={12} style={[pal.text]} />
          </Pressable>
        </View>
      ) : null}
      {feed.type === 'timeline' ? (
        <FollowingFeedCard />
      ) : (
        <FeedSourceCard
          key={feedUri}
          feedUri={feedUri}
          style={styles.noTopBorder}
          showSaveBtn
          showMinimalPlaceholder
        />
      )}
      <View style={{paddingRight: 16}}>
        <Pressable
          disabled={isUpdatePending}
          accessibilityRole="button"
          hitSlop={10}
          onPress={onTogglePinned}
          style={state => ({
            opacity:
              state.hovered || state.focused || isUpdatePending ? 0.5 : 1,
          })}>
          <FontAwesomeIcon
            icon="thumb-tack"
            size={20}
            color={isPinned ? colors.blue3 : pal.colors.icon}
          />
        </Pressable>
      </View>
    </View>
  )
}

function FollowingFeedCard() {
  const t = useTheme()
  return (
    <View
      style={[
        a.flex_row,
        a.align_center,
        a.flex_1,
        {
          paddingHorizontal: 18,
          paddingVertical: 20,
        },
      ]}>
      <View
        style={[
          a.align_center,
          a.justify_center,
          a.rounded_sm,
          {
            width: 36,
            height: 36,
            backgroundColor: t.palette.primary_500,
            marginRight: 10,
          },
        ]}>
        <FilterTimeline
          style={[
            {
              width: 22,
              height: 22,
            },
          ]}
          fill={t.palette.white}
        />
      </View>
      <View
        style={{flex: 1, flexDirection: 'row', gap: 8, alignItems: 'center'}}>
        <Text type="lg-medium" style={[t.atoms.text]} numberOfLines={1}>
          Following
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  desktopContainer: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    // @ts-ignore only rendered on web
    minHeight: '100vh',
  },
  empty: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderRadius: 8,
    marginHorizontal: 10,
    marginTop: 10,
  },
  title: {
    paddingHorizontal: 14,
    paddingTop: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  webArrowButtonsContainer: {
    paddingLeft: 16,
    flexDirection: 'column',
    justifyContent: 'space-around',
  },
  webArrowUpButton: {
    marginBottom: 10,
  },
  noTopBorder: {
    borderTopWidth: 0,
  },
  footerText: {
    paddingHorizontal: 26,
    paddingTop: 22,
    paddingBottom: 100,
  },
  noBorder: {
    borderBottomWidth: 0,
    borderRightWidth: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
})
