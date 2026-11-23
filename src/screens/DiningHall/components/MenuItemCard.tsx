import React from 'react';
import { View, Text } from 'react-native';
import { styles } from '../styles/MenuItemCard.styles';

interface Props {
    name: string;
    initialFavorited?: boolean;
    isLast?: boolean;
    }

    // ponytail: favorite heart hidden — it only flipped on screen. The API's POST /favorites takes
    // a comboId, not a menu item, so there is nothing to save it to. Restore the heart (git history)
    // once the backend has a menu-item favorites endpoint and fills FullMenuItem.favorited.
    export const MenuItemCard = ({ name, isLast = false }: Props) => (
        <View style={[styles.menuItem, isLast && styles.menuItemLast]}>
        <Text style={styles.menuItemName}>{name}</Text>
        </View>
    );
